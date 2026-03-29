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
    purpose: "Holds escrow principal + pre-paid escrow fee. Releases principal to vendor, trickles fee to Transaction Wallet.",
  },
};

const USDC_ADDRESS = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
const USDT_ADDRESS = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
const TOKEN_DECIMALS = 6;

// ─── Fee Rate Constants ──────────────────────────────────
// NEW MODEL: Escrow fee is pre-paid at checkout (added to buyer's total)
// and sent alongside principal to escrow wallet. NOT deducted from principal.
const FEE_RATES = {
  platform_fiat: 1.5,
  platform_crypto: 1.0,
  escrow_service: 1.0,    // 1% escrow fee — pre-paid at checkout, trickled on release
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
//  ROUTING LOGIC — REVISED FEE MODEL
// ═══════════════════════════════════════════════════════════
//
//  INBOUND (all payment methods):
//   1. Buyer pays: escrow principal + escrow fee (1%) + platform fee + processor fee + taxes
//   2. ALL funds land in Transaction Fee Wallet
//   3. Transaction Wallet retains: platform fee + taxes
//   4. Transaction Wallet routes to Escrow Wallet: escrow principal + escrow fee
//   5. Escrow Wallet holds both until release or refund
//
//  RELEASE:
//   1. Escrow Wallet sends 100% principal to vendor (preserved, no deductions)
//   2. Escrow Wallet trickles pre-paid escrow fee → Transaction Wallet
//   3. Gas covered by platform revenue
//
//  REFUND:
//   1. Escrow Wallet returns 100% principal to buyer
//   2. Pre-paid escrow fee also returned to buyer (or absorbed — see below)
//   3. No TrustLock service fees on refunds. Gas only (~$0.02-$0.05)
//
//  SPLIT (Dispute):
//   1. Escrow fee halved from original milestone rate, vendor side only
//   2. Gas split equally between buyer & vendor
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
      const escrowPrincipal = verifiedAmount || tx.amount;
      const taxBreakdown = tx.tax_breakdown as Record<string, unknown> | null;

      // 1) Platform fee (retained by Transaction Wallet)
      const platformRate = isCrypto ? FEE_RATES.platform_crypto : FEE_RATES.platform_fiat;
      const platformFee = round(escrowPrincipal * (platformRate / 100));

      // 2) Processor fee (already deducted by processor for fiat, 0 for direct)
      const processorRate = FEE_RATES.processor[usedProcessor] || 0;
      const processorFee = usedProcessor === "direct" ? 0 : round(escrowPrincipal * (processorRate / 100));

      // 3) Escrow service fee (1% of principal — pre-paid, routed WITH principal)
      const escrowFee = round(escrowPrincipal * (FEE_RATES.escrow_service / 100));

      // 4) Jurisdiction taxes
      let taxAmount = 0;
      let taxType = "None";
      if (taxBreakdown) {
        taxAmount = round(Number(taxBreakdown.tax_amount || 0) + Number(taxBreakdown.tariff_amount || 0));
        taxType = String(taxBreakdown.tax_type || "None");
      }

      // 5) Transaction Wallet retains platform fee + taxes
      const transactionWalletRetains = round(platformFee + taxAmount);

      // 6) Escrow Wallet receives: full principal + escrow fee
      const escrowWalletReceives = round(escrowPrincipal + escrowFee);

      if (escrowPrincipal <= 0) {
        return json({
          error: "Escrow principal would be zero or negative",
          breakdown: { escrowPrincipal, platformFee, processorFee, escrowFee, taxAmount },
        }, 400);
      }

      // 7) Transfer: Transaction Wallet → Escrow Wallet (principal + escrow fee)
      // Gas for this internal transfer is covered by TrustLock platform revenue
      const routingTransfer = await transferOnChain(
        WALLETS.transaction.address,
        WALLETS.escrow.address,
        escrowWalletReceives,
        token,
        `Escrow principal ($${escrowPrincipal}) + escrow fee ($${escrowFee}) for TX ${tx.tx_id}`
      );

      // 8) Update transaction
      await supabase
        .from("transactions")
        .update({
          status: "locked",
          fee: transactionWalletRetains,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transactionId);

      // 8b) Log tax collection to tax_ledger for admin remittance tracking
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
          taxable_amount: escrowPrincipal,
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

      // 9) Notify
      await notify(
        supabase, tx.vendor_id,
        "Funds Secured in Escrow",
        `$${escrowPrincipal.toFixed(2)} has been locked in escrow for order #${tx.order_number || tx.tx_id}. ` +
        `The full escrow amount will be released to you upon completion — no fees deducted from your payout.`,
        "success", transactionId
      );

      await notify(
        supabase, tx.buyer_id,
        "Payment Secured",
        `Your payment is secured. $${escrowPrincipal.toFixed(2)} is held in escrow for order #${tx.order_number || tx.tx_id}. ` +
        `Fees paid: Platform $${platformFee.toFixed(2)}, Escrow service $${escrowFee.toFixed(2)}` +
        `${taxAmount > 0 ? `, Tax $${taxAmount.toFixed(2)}` : ""}. ` +
        `In case of refund, you receive 100% of the escrow amount — only gas fees apply.`,
        "success", transactionId
      );

      const result: RoutingResult = {
        action: "route_inbound",
        transactionId,
        grossAmount: round(escrowPrincipal + escrowFee + platformFee + processorFee + taxAmount),
        platformFee,
        processorFee,
        escrowFee,
        taxAmount,
        taxType,
        totalDeductions: transactionWalletRetains,
        transactionWalletRetains,
        escrowWalletReceives,
        transfers: [{
          from: WALLETS.transaction.address,
          to: WALLETS.escrow.address,
          amount: escrowWalletReceives,
          token,
          memo: `Escrow principal + fee for TX ${tx.tx_id}`,
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
    //  ACTION: ROUTE_RELEASE — Vendor gets 100% principal
    // ══════════════════════════════════════════════════
    if (action === "route_release") {
      // Escrow wallet holds: principal + escrow fee
      // Vendor gets: 100% principal (preserved)
      // Escrow fee trickles: → Transaction Wallet
      const escrowPrincipal = tx.amount;
      const escrowFee = round(escrowPrincipal * (FEE_RATES.escrow_service / 100));

      // Transfer 1: Escrow fee → Transaction Wallet (trickle-down)
      const trickleTransfer = await transferOnChain(
        WALLETS.escrow.address,
        WALLETS.transaction.address,
        escrowFee,
        token,
        `Escrow fee trickle-down for TX ${tx.tx_id}`
      );

      // Transfer 2: Full principal → Vendor (100%, no deductions)
      const vendorWallet = body.vendorWallet || "vendor_pending";
      const payoutTransfer = await transferOnChain(
        WALLETS.escrow.address,
        vendorWallet,
        escrowPrincipal,
        token,
        `Vendor payout (100% principal) for TX ${tx.tx_id}`
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
        "Funds Released — Full Amount",
        `$${escrowPrincipal.toFixed(2)} released to your account (100% of escrow principal, no deductions). ` +
        `Escrow service fee of $${escrowFee.toFixed(2)} was pre-paid by the buyer at checkout.`,
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
        escrowFee,
        vendorPayout: escrowPrincipal,
        trickleToTransactionWallet: escrowFee,
        transfers: [
          {
            from: WALLETS.escrow.address,
            to: WALLETS.transaction.address,
            amount: escrowFee,
            token,
            memo: "Escrow fee trickle-down",
            txHash: trickleTransfer.txHash,
            status: trickleTransfer.status,
          },
          {
            from: WALLETS.escrow.address,
            to: vendorWallet,
            amount: escrowPrincipal,
            token,
            memo: "Vendor payout (100% principal)",
            txHash: payoutTransfer.txHash,
            status: payoutTransfer.status,
          },
        ],
      });
    }

    // ══════════════════════════════════════════════════
    //  ACTION: ROUTE_REFUND — 100% principal back, gas only
    // ══════════════════════════════════════════════════
    if (action === "route_refund") {
      const escrowPrincipal = tx.amount;
      // Pre-paid escrow fee: part used to cover gas, remainder returned to buyer
      const escrowFee = round(escrowPrincipal * (FEE_RATES.escrow_service / 100));
      const estimatedGas = 0.03; // ~$0.03 Polygon gas, absorbed from escrow fee
      const escrowFeeAfterGas = round(escrowFee - estimatedGas);
      // Buyer gets: full principal + escrow fee minus gas absorbed
      const totalRefund = round(escrowPrincipal + escrowFeeAfterGas);
      const buyerWallet = body.buyerWallet || "buyer_pending";

      // Gas absorbed from escrow fee — buyer pays $0 in gas
      const refundTransfer = await transferOnChain(
        WALLETS.escrow.address,
        buyerWallet,
        totalRefund,
        token,
        `Full refund (principal + escrow fee - gas absorbed) for TX ${tx.tx_id}`
      );

      // Tiny remainder (gas cost) stays in escrow wallet to cover network fee
      // This is NOT a TrustLock charge — it's the blockchain network fee absorbed from the pre-paid escrow fee

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

      await notify(
        supabase, tx.buyer_id,
        "Refund Processed — $0 Fees",
        `Full refund of $${totalRefund.toFixed(2)} initiated for order #${tx.order_number || tx.tx_id}. ` +
        `This includes your escrow principal ($${escrowPrincipal.toFixed(2)}) and pre-paid escrow fee ($${escrowFeeAfterGas.toFixed(2)}). ` +
        `No TrustLock service fees or gas fees charged to you. Gas was absorbed from the escrow service fee.`,
        "success", transactionId
      );

      return json({
        success: true,
        action: "route_refund",
        transactionId,
        refundAmount: totalRefund,
        escrowPrincipal,
        escrowFeeReturned: escrowFeeAfterGas,
        gasAbsorbedFromEscrowFee: estimatedGas,
        feesChargedToBuyer: 0,
        gasNote: "Gas fees absorbed from pre-paid escrow fee. Buyer pays $0.",
        transfers: [{
          from: WALLETS.escrow.address,
          to: buyerWallet,
          amount: totalRefund,
          token,
          memo: "Full refund — $0 fees to buyer, gas absorbed from escrow fee",
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
      const prePaidEscrowFee = round(escrowPrincipal * (FEE_RATES.escrow_service / 100));
      const totalInEscrow = round(escrowPrincipal + prePaidEscrowFee);

      const buyerAmount = round(escrowPrincipal * buyerShare);
      const vendorGross = round(escrowPrincipal * vendorShare);

      // Escrow fee halved from original rate, vendor side only
      const originalMilestoneRate = body.originalMilestoneEscrowRate ?? FEE_RATES.escrow_service;
      const halvedRate = originalMilestoneRate / 2;
      const vendorEscrowFee = round(vendorGross * (halvedRate / 100));
      const vendorNet = round(vendorGross - vendorEscrowFee);

      // Gas absorbed from pre-paid escrow fee — $0 to buyer and vendor
      const estimatedGasTotal = 0.05; // ~$0.05 total for 2 transfers
      // Remaining escrow fee from pre-paid amount: trickle to Transaction Wallet minus gas
      const feeToTrickle = round(prePaidEscrowFee - vendorEscrowFee - estimatedGasTotal);

      const transfers = [];

      // 1) Trickle remaining escrow fee (minus gas) → Transaction Wallet
      if (feeToTrickle > 0) {
        const trickle = await transferOnChain(
          WALLETS.escrow.address, WALLETS.transaction.address,
          feeToTrickle, token,
          `Split escrow fee trickle (gas absorbed) for TX ${tx.tx_id}`
        );
        transfers.push({
          from: WALLETS.escrow.address,
          to: WALLETS.transaction.address,
          amount: feeToTrickle,
          token, memo: "Split escrow fee trickle-down (gas absorbed from escrow fee)",
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

      await notify(supabase, tx.buyer_id,
        "Dispute Resolved",
        `You receive $${buyerAmount.toFixed(2)} from arbitration (${(buyerShare * 100).toFixed(0)}% of principal). ` +
        `$0 gas fees — absorbed from the pre-paid escrow fee. No TrustLock service fees on your portion.`,
        "info", transactionId);
      await notify(supabase, tx.vendor_id,
        "Dispute Resolved",
        `You receive $${vendorNet.toFixed(2)} from arbitration (${(vendorShare * 100).toFixed(0)}% of principal). ` +
        `Escrow fee: $${vendorEscrowFee.toFixed(2)} (halved rate: ${halvedRate.toFixed(2)}%). $0 gas fees — absorbed from escrow fee.`,
        "info", transactionId);

      return json({
        success: true,
        action: "route_split",
        transactionId,
        escrowPrincipal,
        prePaidEscrowFee,
        buyerShare,
        vendorShare,
        buyerAmount,
        vendorGross,
        vendorEscrowFee,
        vendorNet,
        halvedEscrowRate: halvedRate,
        gasAbsorbedFromEscrowFee: estimatedGasTotal,
        gasChargedToParties: 0,
        feeToTrickle,
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

      // Fractional escrow fee trickle (from pre-paid escrow fee pool)
      const { count: paymentMilestoneCount } = await supabase
        .from("transaction_milestones")
        .select("id", { count: "exact", head: true })
        .eq("transaction_id", transactionId)
        .gt("payment_amount", 0);

      const pmCount = paymentMilestoneCount || 1;
      const totalPrePaidEscrowFee = round(tx.amount * (FEE_RATES.escrow_service / 100));
      const fractionalFee = round(totalPrePaidEscrowFee / pmCount);

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
        ? round(totalPrePaidEscrowFee - feesAlreadyTrickled)
        : fractionalFee;

      // Vendor receives 100% of milestone amount (no deductions from principal!)
      const vendorNet = milestoneAmount;

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

      // Vendor payout — 100% of milestone amount
      const vendorWallet = body.vendorWallet || "vendor_pending";
      const payoutTx = await transferOnChain(
        WALLETS.escrow.address, vendorWallet,
        vendorNet, token,
        `Milestone "${milestone.title}" payout for TX ${tx.tx_id}`
      );
      transfers.push({
        from: WALLETS.escrow.address, to: vendorWallet,
        amount: vendorNet, token,
        memo: `Milestone payout (100% principal)`,
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
        "Milestone Released — Full Amount",
        `$${vendorNet.toFixed(2)} released for milestone "${milestone.title}" — 100% of milestone principal, no deductions. ` +
        `Escrow service fee ($${escrowFeeTrickle.toFixed(2)}) was pre-paid by the buyer at checkout.`,
        "success", transactionId);

      return json({
        success: true,
        action: "route_milestone",
        transactionId,
        milestoneId,
        milestoneAmount,
        escrowFeeTrickle,
        vendorNet,
        vendorReceives100Percent: true,
        trickleToTransactionWallet: escrowFeeTrickle,
        allCompleted: !remaining?.length,
        transfers,
      });
    }

    return json({ error: `Unknown action: ${action}. Supported: route_inbound, route_release, route_refund, route_split, route_milestone` }, 400);
  } catch (err) {
    console.error("wallet-routing-bridge error:", err);
    return json({ success: false, error: err.message }, 500);
  }
});
