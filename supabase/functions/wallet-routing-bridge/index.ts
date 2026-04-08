import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Dual Custodian Wallet Addresses (Polygon) ────────────
const WALLETS = {
  transaction: {
    address: Deno.env.get("AZIX_TRANSACTION_WALLET") || "0x7A3b1234567890abcdef1234567890abcdefF92d",
    label: "Azix Transaction Fee Wallet",
    purpose: "Receives platform fees + taxes. Routes escrow principal + escrow fee to Escrow Wallet.",
  },
  escrow: {
    address: Deno.env.get("AZIX_ESCROW_WALLET") || "0x4E1c1234567890abcdef1234567890abcdefA83b",
    label: "Azix Escrow Wallet",
    purpose: "Holds vendor principal until release. 1% escrow service fee extracted only upon deal completion — never deducted upfront.",
  },
};

const USDC_ADDRESS = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
const USDT_ADDRESS = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
const TOKEN_DECIMALS = 6;

// ─── Fee Rate Constants ──────────────────────────────────
// CORRECTED FEE MODEL:
//   At checkout: ALL post-processor funds → Transaction Fee Wallet
//     Transaction Fee Wallet keeps: 0.5% TrustLock transaction fee + taxes
//     Transaction Fee Wallet routes principal → Escrow Wallet
//     (principal has 1% escrow service fee baked in)
//   At release: 1% extracted from principal → trickled to Transaction Fee Wallet
//   Refund: ALL fees waived
//   The 0.5% is TrustLock's upfront transaction fee — NOT an escrow deposit
//
// GAS MODEL: Gasless (ERC-2771 Meta-Transactions)
//   All on-chain gas is paid in MATIC by TrustLock's Relayer Wallet.
//   No stablecoin (USDC/USDT) deductions for gas.
const FEE_RATES = {
  trustlock_transaction_fee: 0.5, // 0.5% TrustLock upfront transaction fee (kept in Transaction Fee Wallet)
  escrow_service: 1.0,           // 1.0% escrow service fee at release (extracted from vendor principal)
  processor: {
    stripe: 2.9,
    coinbase: 1.5,
    transak: 1.5,
    direct: 0,
  } as Record<string, number>,
};

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function toContractUnits(amount: number): string {
  return BigInt(Math.round(amount * Math.pow(10, TOKEN_DECIMALS))).toString();
}

async function transferOnChain(
  fromWallet: string,
  toWallet: string,
  amount: number,
  token: string,
  memo: string
): Promise<{ txHash: string; status: string }> {
  const privateKey = Deno.env.get("DEPLOYER_WALLET_PRIVATE_KEY");
  if (!privateKey) {
    console.warn(`Wallet routing queued (no deployer key): ${memo}`);
    return {
      txHash: `queued_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      status: "queued",
    };
  }
  return {
    txHash: `queued_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    status: "queued",
  };
}

async function notify(
  supabase: ReturnType<typeof createClient>,
  userId: string | null,
  title: string,
  message: string,
  type: string,
  relatedId?: string
) {
  if (!userId) return;
  await supabase.from("notifications").insert({
    user_id: userId,
    title,
    message,
    type,
    related_entity_type: "wallet_routing",
    related_entity_id: relatedId || null,
  });
}

// ═══════════════════════════════════════════════════════════
//  ROUTING LOGIC — CORRECTED FEE MODEL
// ═══════════════════════════════════════════════════════════
//
//  INBOUND (all payment methods):
//   1. Processor takes their cut first (before funds reach TrustLock)
//   2. ALL remaining funds → Transaction Fee Wallet
//   3. Transaction Fee Wallet keeps: 0.5% TrustLock transaction fee + taxes
//   4. Transaction Fee Wallet routes principal → Escrow Wallet
//      (principal has 1% escrow service fee baked in)
//
//  RELEASE:
//   1. Escrow Wallet extracts 1% from vendor principal → trickles to Transaction Fee Wallet
//   2. Remaining principal → vendor
//
//  REFUND:
//   1. Escrow Wallet returns 100% principal to buyer
//   2. No TrustLock fees charged on refunds
//
//  SPLIT (Dispute):
//   1. 1% escrow fee on vendor share ONLY
//   2. Buyer receives full split amount with zero deduction
// ═══════════════════════════════════════════════════════════

interface RoutingResult {
  action: string;
  transactionId: string;
  grossAmount: number;
  platformFee: number;
  processorFee: number;
  escrowFee: number;
  taxAmount: number;
  taxType: string;
  remittanceFee?: number;
  totalDeductions: number;
  transactionWalletRetains: number;
  escrowWalletReceives: number;
  transfers: Array<{
    from: string;
    to: string;
    amount: number;
    token: string;
    memo: string;
    txHash: string;
    status: string;
  }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const {
      action,
      transactionId,
      processor,
      paymentMethod,
      verifiedAmount,
    } = body;

    if (!action) return json({ error: "action is required" }, 400);
    if (!transactionId) return json({ error: "transactionId is required" }, 400);

    const supabase = getSupabase();

    const { data: tx, error: txErr } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (txErr || !tx) return json({ error: "Transaction not found" }, 404);

    const isCrypto = paymentMethod === "crypto" || processor === "direct";
    const usedProcessor = processor || (isCrypto ? "direct" : "stripe");
    const token = USDC_ADDRESS;

    // ══════════════════════════════════════════════════
    //  ACTION: ROUTE_INBOUND
    // ══════════════════════════════════════════════════
    if (action === "route_inbound") {
      const vendorSubtotal = verifiedAmount || tx.amount;
      const taxBreakdown = tx.tax_breakdown as Record<string, unknown> | null;

      // 1) Processor fee (already deducted by processor before funds reach TrustLock)
      const processorRate = FEE_RATES.processor[usedProcessor] || 0;
      const processorFee = usedProcessor === "direct" ? 0 : round(vendorSubtotal * (processorRate / 100));

      // 2) TrustLock transaction fee: 0.5% → Fee/Revenue Wallet
      const trustlockFee = round(vendorSubtotal * (FEE_RATES.trustlock_transaction_fee / 100));

      // 3) Jurisdiction taxes & duties
      let taxAmount = 0;
      let taxType = "None";
      if (taxBreakdown) {
        taxAmount = round(Number(taxBreakdown.tax_amount || 0) + Number(taxBreakdown.tariff_amount || 0));
        taxType = String(taxBreakdown.tax_type || "None");
      }

      // 4) Remittance fee (wire transfer fee, if collected from buyer)
      const remittanceFee = round(Number(body.remittanceFee || taxBreakdown?.remittance_fee || 0));

      // ══ POST-PROCESSOR SPLIT ══
      // Fee/Revenue Wallet keeps: 0.5% TrustLock fee + taxes + remittance fee
      const transactionWalletRetains = round(trustlockFee + taxAmount + remittanceFee);

      // Escrow Wallet receives: vendor subtotal + any additional invoice amounts
      // (the 1% escrow service fee is baked into this principal — extracted at release)
      const additionalInvoiceAmount = round(Number(body.additionalInvoiceAmount || 0));
      const escrowWalletReceives = round(vendorSubtotal + additionalInvoiceAmount);

      if (escrowWalletReceives <= 0) {
        return json({
          error: "Escrow principal would be zero or negative",
          breakdown: { vendorSubtotal, trustlockFee, processorFee, taxAmount, remittanceFee },
        }, 400);
      }

      // Transfer: vendor subtotal → Escrow Wallet (1% escrow fee baked in, extracted at release)
      const routingTransfer = await transferOnChain(
        WALLETS.transaction.address,
        WALLETS.escrow.address,
        escrowWalletReceives,
        token,
        `Vendor principal ($${escrowWalletReceives}) for TX ${tx.tx_id} — 1% escrow fee baked in`
      );

      // Update transaction with fee breakdown
      await supabase
        .from("transactions")
        .update({
          status: "locked",
          fee: transactionWalletRetains,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transactionId);

      // Log tax collection to tax_ledger for admin remittance tracking
      if (taxAmount > 0 && taxBreakdown) {
        const now = new Date();
        const quarter = `Q${Math.ceil((now.getMonth() + 1) / 3)}`;
        const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

        await supabase.from("tax_ledger").insert({
          transaction_id: transactionId,
          order_number: String(tx.order_number || ""),
          tx_id: tx.tx_id,
          vendor_id: tx.vendor_id || null,
          buyer_id: tx.buyer_id || null,
          vendor_name: tx.vendor_name || null,
          buyer_name: tx.buyer_name || null,
          tax_type: String(taxBreakdown.tax_type || "vat"),
          tax_jurisdiction: String(taxBreakdown.jurisdiction || tx.vendor_location || "Unknown"),
          jurisdiction_country_code: String(taxBreakdown.country_code || ""),
          tax_authority_name: String(taxBreakdown.tax_authority || ""),
          taxable_amount: vendorSubtotal,
          tax_rate: Number(taxBreakdown.tax_rate || 0),
          tax_collected: round(Number(taxBreakdown.tax_amount || 0)),
          tariff_collected: round(Number(taxBreakdown.tariff_amount || 0)),
          total_collected: taxAmount,
          industry: tx.industry || null,
          item_category: String(taxBreakdown.item_category || tx.item || ""),
          buyer_country: tx.buyer_location || null,
          vendor_country: tx.vendor_location || null,
          corridor_route: tx.corridor_route || null,
          remittance_status: "pending",
          collection_period: period,
          fiscal_quarter: `${now.getFullYear()}-${quarter}`,
        });
      }

      // Notify
      await notify(
        supabase, tx.vendor_id,
        "Funds Secured in Escrow",
        `$${escrowWalletReceives.toFixed(2)} has been locked in escrow for order #${tx.order_number || tx.tx_id}. ` +
        `Upon release, a 1% escrow service fee ($${round(escrowWalletReceives * 0.01).toFixed(2)}) will be extracted from your principal. Remainder is your payout.`,
        "success", transactionId
      );

      await notify(
        supabase, tx.buyer_id,
        "Payment Secured",
        `Your payment is secured. $${escrowWalletReceives.toFixed(2)} is held in escrow for order #${tx.order_number || tx.tx_id}. ` +
        `Transaction fee: $${trustlockFee.toFixed(2)}` +
        `${remittanceFee > 0 ? `, Remittance: $${remittanceFee.toFixed(2)}` : ""}` +
        `${taxAmount > 0 ? `, Tax: $${taxAmount.toFixed(2)}` : ""}. ` +
        `In case of refund, you receive 100% of the escrow amount — $0 fees.`,
        "success", transactionId
      );

      const result: RoutingResult = {
        action: "route_inbound",
        transactionId,
        grossAmount: round(escrowWalletReceives + trustlockFee + processorFee + taxAmount + remittanceFee),
        platformFee: trustlockFee,
        processorFee,
        escrowFee: 0, // No escrow deposit at checkout — 1% extracted at release
        taxAmount,
        taxType,
        remittanceFee,
        totalDeductions: transactionWalletRetains,
        transactionWalletRetains,
        escrowWalletReceives,
        transfers: [{
          from: WALLETS.transaction.address,
          to: WALLETS.escrow.address,
          amount: escrowWalletReceives,
          token,
          memo: `Vendor principal for TX ${tx.tx_id} — 1% escrow fee baked in, extracted at release`,
          txHash: routingTransfer.txHash,
          status: routingTransfer.status,
        }],
      };

      // Forward to escrow-bridge
      try {
        const escrowUrl = `${Deno.env.get("SUPABASE_URL")!}/functions/v1/escrow-bridge`;
        await fetch(escrowUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
          },
          body: JSON.stringify({ action: "lock", transactionId }),
        });
      } catch (e) {
        console.warn("Escrow bridge forward failed (non-blocking):", e);
      }

      return json({ success: true, ...result });
    }

    // ══════════════════════════════════════════════════
    //  ACTION: ROUTE_RELEASE — Atomic (non-milestone) release
    //  1% escrow service fee extracted from principal → trickled to Transaction Wallet
    //  Vendor receives: principal minus 1% escrow fee
    //  Escrow Wallet net balance = 0 after forwarding
    // ══════════════════════════════════════════════════
    if (action === "route_release") {
      const escrowPrincipal = tx.amount;
      const escrowServiceFee = round(escrowPrincipal * (FEE_RATES.escrow_service / 100));
      const vendorPayout = round(escrowPrincipal - escrowServiceFee);

      // Transfer 1: Escrow fee → Transaction Wallet (trickle-down)
      const trickleTransfer = await transferOnChain(
        WALLETS.escrow.address,
        WALLETS.transaction.address,
        escrowServiceFee,
        token,
        `Escrow fee trickle-down for TX ${tx.tx_id}`
      );

      // Transfer 2: Vendor payout (principal minus 1% escrow fee)
      const vendorWallet = body.vendorWallet || "vendor_pending";
      const payoutTransfer = await transferOnChain(
        WALLETS.escrow.address,
        vendorWallet,
        vendorPayout,
        token,
        `Vendor payout for TX ${tx.tx_id} (principal - 1% escrow fee)`
      );

      await supabase
        .from("transactions")
        .update({
          status: "released",
          released_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", transactionId);

      try {
        const escrowUrl = `${Deno.env.get("SUPABASE_URL")!}/functions/v1/escrow-bridge`;
        await fetch(escrowUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
          },
          body: JSON.stringify({ action: "release", transactionId }),
        });
      } catch (e) {
        console.warn("Escrow bridge release forward failed:", e);
      }

      await notify(
        supabase, tx.vendor_id,
        "Funds Released",
        `$${vendorPayout.toFixed(2)} released to your account. ` +
        `1% escrow service fee ($${escrowServiceFee.toFixed(2)}) deducted from your principal and trickled to the Transaction Wallet.`,
        "success", transactionId
      );

      await notify(
        supabase, tx.buyer_id,
        "Order Completed",
        `Funds for order #${tx.order_number || tx.tx_id} have been released to the vendor.`,
        "info", transactionId
      );

      return json({
        success: true,
        action: "route_release",
        transactionId,
        escrowPrincipal,
        escrowServiceFee,
        vendorPayout,
        trickleToTransactionWallet: escrowServiceFee,
        transfers: [
          {
            from: WALLETS.escrow.address,
            to: WALLETS.transaction.address,
            amount: escrowServiceFee,
            token,
            memo: "Escrow service fee trickle-down (1% of principal)",
            txHash: trickleTransfer.txHash,
            status: trickleTransfer.status,
          },
          {
            from: WALLETS.escrow.address,
            to: vendorWallet,
            amount: vendorPayout,
            token,
            memo: "Vendor payout (principal - 1% escrow fee)",
            txHash: payoutTransfer.txHash,
            status: payoutTransfer.status,
          },
        ],
      });
    }

    // ══════════════════════════════════════════════════
    //  ACTION: ROUTE_REFUND — 100% of locked principal back to buyer
    //  $0 fees — ALL fees waived. Gas paid in MATIC by Relayer.
    //  The 0.5% transaction fee was already kept by Transaction Wallet at checkout
    //  and is NOT refunded (it's TrustLock revenue, not an escrow deposit).
    // ══════════════════════════════════════════════════
    if (action === "route_refund") {
      // Escrow Wallet holds ONLY the vendor principal (1% escrow fee baked in).
      // On refund, return the FULL locked amount to buyer — $0 deductions.
      const lockedPrincipal = tx.amount;
      const buyerWallet = body.buyerWallet || "buyer_pending";

      const refundTransfer = await transferOnChain(
        WALLETS.escrow.address,
        buyerWallet,
        lockedPrincipal,
        token,
        `Full refund (locked principal) for TX ${tx.tx_id}`
      );

      await supabase
        .from("transactions")
        .update({
          status: "refunded",
          updated_at: new Date().toISOString(),
        })
        .eq("id", transactionId);

      try {
        const escrowUrl = `${Deno.env.get("SUPABASE_URL")!}/functions/v1/escrow-bridge`;
        await fetch(escrowUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
          },
          body: JSON.stringify({ action: "refund", transactionId }),
        });
      } catch (e) {
        console.warn("Escrow bridge refund forward failed:", e);
      }

      // ── Trigger Refund Router for last-mile disbursement ──
      let refundRouteResult: Record<string, unknown> | null = null;
      try {
        const refundRouterUrl = `${Deno.env.get("SUPABASE_URL")!}/functions/v1/refund-router`;
        const rrRes = await fetch(refundRouterUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
          },
          body: JSON.stringify({
            action: "route_buyer_refund",
            transactionId,
            refundAmount: lockedPrincipal,
            refundType: "full_refund",
            buyerPaymentDetails: body.buyerPaymentDetails || null,
            originalProcessor: body.originalProcessor || null,
            paymentCategory: body.paymentCategory || null,
            buyerId: tx.buyer_id,
          }),
        });
        refundRouteResult = await rrRes.json();
      } catch (e) {
        console.warn("Refund router forward failed (non-blocking):", e);
      }

      await notify(
        supabase, tx.buyer_id,
        "Refund Processed — $0 Fees",
        `Full refund of $${lockedPrincipal.toFixed(2)} initiated for order #${tx.order_number || tx.tx_id}. ` +
        `No fees charged. Gas is covered by TrustLock.`,
        "success", transactionId
      );

      return json({
        success: true,
        action: "route_refund",
        transactionId,
        refundAmount: lockedPrincipal,
        feesChargedToBuyer: 0,
        gasModel: "Gasless — MATIC paid by TrustLock Relayer Wallet",
        note: "The 0.5% transaction fee collected at checkout is NOT refunded — it is TrustLock revenue.",
        refundDisbursement: refundRouteResult,
        transfers: [{
          from: WALLETS.escrow.address,
          to: buyerWallet,
          amount: lockedPrincipal,
          token,
          memo: "Full refund — $0 fees, gasless",
          txHash: refundTransfer.txHash,
          status: refundTransfer.status,
        }],
      });
    }

    // ══════════════════════════════════════════════════
    //  ACTION: ROUTE_SPLIT — Dispute resolution
    // ══════════════════════════════════════════════════
    if (action === "route_split") {
      const { buyerShare, vendorShare } = body;
      if (buyerShare == null || vendorShare == null) {
        return json({ error: "buyerShare and vendorShare (0-1) are required" }, 400);
      }

      const escrowPrincipal = tx.amount;
      // No escrow deposit — the 0.5% was a transaction fee kept by Transaction Wallet at checkout

      const buyerAmount = round(escrowPrincipal * buyerShare);
      const vendorGross = round(escrowPrincipal * vendorShare);

      // 1.0% escrow fee on VENDOR share only
      const vendorEscrowFee = round(vendorGross * (FEE_RATES.escrow_service / 100));
      const vendorNet = round(vendorGross - vendorEscrowFee);

      // Trickle vendor escrow fee → Transaction Wallet
      const feeToTrickle = vendorEscrowFee;

      const transfers = [];

      // 1) Trickle escrow fee + deposit → Transaction Wallet
      if (feeToTrickle > 0) {
        const trickle = await transferOnChain(
          WALLETS.escrow.address, WALLETS.transaction.address,
          feeToTrickle, token,
          `Split escrow fee trickle for TX ${tx.tx_id}`
        );
        transfers.push({
          from: WALLETS.escrow.address,
          to: WALLETS.transaction.address,
          amount: feeToTrickle,
          token, memo: "Split escrow fee trickle-down",
          txHash: trickle.txHash, status: trickle.status,
        });
      }

      // 2) Buyer portion — full amount, $0 gas
      if (buyerAmount > 0) {
        const buyerWallet = body.buyerWallet || "buyer_pending";
        const buyerTx = await transferOnChain(
          WALLETS.escrow.address, buyerWallet,
          buyerAmount, token,
          `Buyer split portion for TX ${tx.tx_id}`
        );
        transfers.push({
          from: WALLETS.escrow.address,
          to: buyerWallet,
          amount: buyerAmount,
          token, memo: "Buyer arbitration share ($0 gas — absorbed from escrow fee)",
          txHash: buyerTx.txHash, status: buyerTx.status,
        });
      }

      // 3) Vendor net payout — escrow fee deducted, $0 gas
      if (vendorNet > 0) {
        const vendorWallet = body.vendorWallet || "vendor_pending";
        const vendorTx = await transferOnChain(
          WALLETS.escrow.address, vendorWallet,
          vendorNet, token,
          `Vendor split payout for TX ${tx.tx_id}`
        );
        transfers.push({
          from: WALLETS.escrow.address,
          to: vendorWallet,
          amount: vendorNet,
          token, memo: `Vendor arbitration share (escrow fee: -$${vendorEscrowFee.toFixed(2)}, $0 gas)`,
          txHash: vendorTx.txHash, status: vendorTx.status,
        });
      }

      await supabase
        .from("transactions")
        .update({
          status: "split_resolved",
          updated_at: new Date().toISOString(),
        })
        .eq("id", transactionId);

      try {
        const escrowUrl = `${Deno.env.get("SUPABASE_URL")!}/functions/v1/escrow-bridge`;
        await fetch(escrowUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
          },
          body: JSON.stringify({
            action: "split", transactionId,
            buyerAmount, vendorAmount: vendorNet,
          }),
        });
      } catch (e) {
        console.warn("Escrow bridge split forward failed:", e);
      }

      // ── Trigger Refund Router for buyer's split portion ──
      let splitRefundRoute: Record<string, unknown> | null = null;
      if (buyerAmount > 0) {
        try {
          const refundRouterUrl = `${Deno.env.get("SUPABASE_URL")!}/functions/v1/refund-router`;
          const rrRes = await fetch(refundRouterUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
            },
            body: JSON.stringify({
              action: "route_buyer_refund",
              transactionId,
              refundAmount: buyerAmount,
              refundType: "split_buyer",
              buyerPaymentDetails: body.buyerPaymentDetails || null,
              originalProcessor: body.originalProcessor || null,
              paymentCategory: body.paymentCategory || null,
              buyerId: tx.buyer_id,
            }),
          });
          splitRefundRoute = await rrRes.json();
        } catch (e) {
          console.warn("Refund router split forward failed (non-blocking):", e);
        }
      }

      await notify(supabase, tx.buyer_id,
        "Dispute Resolved",
        `You receive $${buyerAmount.toFixed(2)} from arbitration (${(buyerShare * 100).toFixed(0)}% of principal). ` +
        `$0 fees on your portion. Gas covered by TrustLock.`,
        "info", transactionId);
      await notify(supabase, tx.vendor_id,
        "Dispute Resolved",
        `You receive $${vendorNet.toFixed(2)} from arbitration (${(vendorShare * 100).toFixed(0)}% of principal). ` +
        `1% escrow fee on your share: $${vendorEscrowFee.toFixed(2)}.`,
        "info", transactionId);

      return json({
        success: true,
        action: "route_split",
        transactionId,
        escrowPrincipal,
        buyerShare,
        vendorShare,
        buyerAmount,
        vendorGross,
        vendorEscrowFee,
        vendorNet,
        feeToTrickle,
        gasChargedToParties: 0,
        gasModel: "Gasless — MATIC paid by TrustLock Relayer Wallet",
        buyerRefundDisbursement: splitRefundRoute,
        transfers,
      });
    }

    // ══════════════════════════════════════════════════
    //  ACTION: ROUTE_MILESTONE — Fractional release
    // ══════════════════════════════════════════════════
    if (action === "route_milestone") {
      const { milestoneId } = body;
      if (!milestoneId) return json({ error: "milestoneId is required" }, 400);

      const { data: milestone } = await supabase
        .from("transaction_milestones")
        .select("*")
        .eq("id", milestoneId)
        .single();

      if (!milestone) return json({ error: "Milestone not found" }, 404);

      const milestoneAmount = Number(milestone.amount) || 0;

      // Zero-amount checkpoint: no funds move
      if (milestoneAmount <= 0) {
        await supabase
          .from("transaction_milestones")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", milestoneId);

        const { data: remaining } = await supabase
          .from("transaction_milestones")
          .select("id")
          .eq("transaction_id", transactionId)
          .neq("status", "completed");

        if (!remaining?.length) {
          await supabase
            .from("transactions")
            .update({
              status: "released",
              milestone_status: "all_completed",
              released_date: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", transactionId);
        }

        await notify(supabase, tx.vendor_id,
          "Milestone Completed",
          `Checkpoint "${milestone.title}" marked complete. No funds released.`,
          "info", transactionId);

        return json({
          success: true,
          action: "route_milestone",
          transactionId,
          milestoneId,
          milestoneAmount: 0,
          escrowFee: 0,
          vendorNet: 0,
          checkpoint: true,
          allCompleted: !remaining?.length,
          transfers: [],
        });
      }

      // Fractional escrow fee: 1% of TOTAL principal, split across payment milestones
      const { count: paymentMilestoneCount } = await supabase
        .from("transaction_milestones")
        .select("id", { count: "exact", head: true })
        .eq("transaction_id", transactionId)
        .gt("payment_amount", 0);

      const pmCount = paymentMilestoneCount || 1;
      const totalEscrowFee = round(tx.amount * (FEE_RATES.escrow_service / 100));
      const fractionalFee = round(totalEscrowFee / pmCount);

      const { count: completedPaymentMilestones } = await supabase
        .from("transaction_milestones")
        .select("id", { count: "exact", head: true })
        .eq("transaction_id", transactionId)
        .eq("status", "completed")
        .gt("payment_amount", 0);

      const priorCompleted = completedPaymentMilestones || 0;
      const isLastPaymentMilestone = (priorCompleted + 1) === pmCount;
      const feesAlreadyTrickled = round(fractionalFee * priorCompleted);
      const escrowFeeTrickle = isLastPaymentMilestone
        ? round(totalEscrowFee - feesAlreadyTrickled)
        : fractionalFee;

      // Vendor receives: milestone amount minus their fractional escrow fee
      const vendorNet = round(milestoneAmount - escrowFeeTrickle);

      const transfers = [];

      // Trickle fractional escrow fee → Transaction Wallet
      if (escrowFeeTrickle > 0) {
        const trickle = await transferOnChain(
          WALLETS.escrow.address, WALLETS.transaction.address,
          escrowFeeTrickle, token,
          `Milestone "${milestone.title}" escrow fee trickle for TX ${tx.tx_id}`
        );
        transfers.push({
          from: WALLETS.escrow.address, to: WALLETS.transaction.address,
          amount: escrowFeeTrickle, token,
          memo: `Milestone escrow fee trickle-down`,
          txHash: trickle.txHash, status: trickle.status,
        });
      }

      // Vendor payout — milestone amount minus fractional escrow fee
      const vendorWallet = body.vendorWallet || "vendor_pending";
      const payoutTx = await transferOnChain(
        WALLETS.escrow.address, vendorWallet,
        vendorNet, token,
        `Milestone "${milestone.title}" payout for TX ${tx.tx_id} ($${vendorNet} after fractional fee)`
      );
      transfers.push({
        from: WALLETS.escrow.address, to: vendorWallet,
        amount: vendorNet, token,
        memo: `Milestone payout (principal $${milestoneAmount} - escrow fee $${escrowFeeTrickle})`,
        txHash: payoutTx.txHash, status: payoutTx.status,
      });

      await supabase
        .from("transaction_milestones")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", milestoneId);

      const { data: remaining } = await supabase
        .from("transaction_milestones")
        .select("id")
        .eq("transaction_id", transactionId)
        .neq("status", "completed");

      if (!remaining?.length) {
        await supabase
          .from("transactions")
          .update({
            status: "released",
            milestone_status: "all_completed",
            released_date: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", transactionId);
      }

      try {
        const escrowUrl = `${Deno.env.get("SUPABASE_URL")!}/functions/v1/escrow-bridge`;
        await fetch(escrowUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
          },
          body: JSON.stringify({
            action: "release_milestone",
            transactionId,
            milestoneIndex: milestone.order_index,
          }),
        });
      } catch (e) {
        console.warn("Escrow bridge milestone forward failed:", e);
      }

      await notify(supabase, tx.vendor_id,
        "Milestone Released",
        `$${vendorNet.toFixed(2)} released for milestone "${milestone.title}" ($${milestoneAmount.toFixed(2)} principal - $${escrowFeeTrickle.toFixed(2)} escrow service fee). ` +
        `1% total fee ($${totalEscrowFee.toFixed(2)}) is fractionalized across ${pmCount} milestones.`,
        "success", transactionId);

      return json({
        success: true,
        action: "route_milestone",
        transactionId,
        milestoneId,
        milestoneAmount,
        escrowFeeTrickle,
        vendorNet,
        vendorReceivesPrincipalMinusFee: true,
        trickleToTransactionWallet: escrowFeeTrickle,
        allCompleted: !remaining?.length,
        transfers,
      });
    }

    // ══════════════════════════════════════════════════
    //  ACTION: ROUTE_REFUND_MILESTONE — Refund a single milestone
    //  $0 fees — returns milestone amount to buyer, no trickle
    // ══════════════════════════════════════════════════
    if (action === "route_refund_milestone") {
      const { milestoneId } = body;
      if (!milestoneId) return json({ error: "milestoneId is required" }, 400);

      const { data: milestone } = await supabase
        .from("transaction_milestones")
        .select("*")
        .eq("id", milestoneId)
        .single();

      if (!milestone) return json({ error: "Milestone not found" }, 404);

      const milestoneAmount = Number(milestone.amount) || 0;
      const buyerWallet = body.buyerWallet || "buyer_pending";

      const transfers = [];

      if (milestoneAmount > 0) {
        const refundTx = await transferOnChain(
          WALLETS.escrow.address, buyerWallet,
          milestoneAmount, token,
          `Milestone "${milestone.title}" refund for TX ${tx.tx_id}`
        );
        transfers.push({
          from: WALLETS.escrow.address, to: buyerWallet,
          amount: milestoneAmount, token,
          memo: `Milestone refund — $0 fees, gasless`,
          txHash: refundTx.txHash, status: refundTx.status,
        });
      }

      await supabase
        .from("transaction_milestones")
        .update({ status: "refunded", completed_at: new Date().toISOString() })
        .eq("id", milestoneId);

      // Check if all milestones resolved
      const { data: pendingMilestones } = await supabase
        .from("transaction_milestones")
        .select("id")
        .eq("transaction_id", transactionId)
        .not("status", "in", '("completed","refunded")');

      const allResolved = !pendingMilestones?.length;

      if (allResolved) {
        await supabase
          .from("transactions")
          .update({
            status: "refunded",
            milestone_status: "all_completed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", transactionId);
      }

      // Forward to escrow-bridge
      try {
        const escrowUrl = `${Deno.env.get("SUPABASE_URL")!}/functions/v1/escrow-bridge`;
        await fetch(escrowUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
          },
          body: JSON.stringify({
            action: "refund_milestone",
            transactionId,
            milestoneIndex: milestone.order_index,
          }),
        });
      } catch (e) {
        console.warn("Escrow bridge milestone refund forward failed:", e);
      }

      // ── Trigger Refund Router for milestone refund disbursement ──
      let milestoneRefundRoute: Record<string, unknown> | null = null;
      if (milestoneAmount > 0) {
        try {
          const refundRouterUrl = `${Deno.env.get("SUPABASE_URL")!}/functions/v1/refund-router`;
          const rrRes = await fetch(refundRouterUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
            },
            body: JSON.stringify({
              action: "route_buyer_refund",
              transactionId,
              refundAmount: milestoneAmount,
              refundType: "milestone_refund",
              buyerPaymentDetails: body.buyerPaymentDetails || null,
              originalProcessor: body.originalProcessor || null,
              paymentCategory: body.paymentCategory || null,
              buyerId: tx.buyer_id,
              milestoneId,
            }),
          });
          milestoneRefundRoute = await rrRes.json();
        } catch (e) {
          console.warn("Refund router milestone forward failed (non-blocking):", e);
        }
      }

      await notify(supabase, tx.buyer_id,
        "Milestone Refunded",
        `$${milestoneAmount.toFixed(2)} refunded for milestone "${milestone.title}" — $0 fees. Gas covered by TrustLock.`,
        "success", transactionId);

      return json({
        success: true,
        action: "route_refund_milestone",
        transactionId,
        milestoneId,
        refundAmount: milestoneAmount,
        feesCharged: 0,
        allResolved,
        refundDisbursement: milestoneRefundRoute,
        transfers,
      });
    }

    return json({ error: `Unknown action: ${action}. Supported: route_inbound, route_release, route_refund, route_split, route_milestone, route_refund_milestone` }, 400);
  } catch (err) {
    console.error("wallet-routing-bridge error:", err);
    return json({ success: false, error: err.message }, 500);
  }
});
