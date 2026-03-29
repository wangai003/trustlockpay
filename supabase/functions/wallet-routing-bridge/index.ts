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
    purpose: "Receives ALL incoming funds first. Deducts TrustLock fees + taxes. Routes escrow principal onward.",
  },
  escrow: {
    address: Deno.env.get("AZIX_ESCROW_WALLET") || "0x4E1c1234567890abcdef1234567890abcdefA83b",
    label: "Azix Escrow Wallet",
    purpose: "Holds only the escrow principal. Releases to vendor or refunds to buyer.",
  },
};

const USDC_ADDRESS = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
const USDT_ADDRESS = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
const TOKEN_DECIMALS = 6;

// ─── Fee Rate Constants (mirror feeEngine.ts) ─────────────
const FEE_RATES = {
  platform_fiat: 1.5,    // TrustLock platform fee for fiat
  platform_crypto: 1.0,  // TrustLock platform fee for crypto direct
  escrow_deposit: 0.5,   // Escrow deposit fee at checkout
  escrow_release: 1.0,   // Escrow service fee at release
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

// ─── On-chain transfer (queued until contract deployed) ───
async function transferOnChain(
  fromWallet: string,
  toWallet: string,
  amount: number,
  token: string,
  memo: string
): Promise<{ txHash: string; status: string }> {
  const privateKey = Deno.env.get("DEPLOYER_WALLET_PRIVATE_KEY");
  const rpcUrl = Deno.env.get("POLYGON_RPC_URL") || "https://polygon-rpc.com";

  if (!privateKey) {
    console.warn(`Wallet routing queued (no deployer key): ${memo}`);
    return {
      txHash: `queued_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      status: "queued",
    };
  }

  // Production: Use ethers.js to call ERC-20 transfer
  // const wallet = new ethers.Wallet(privateKey, new ethers.JsonRpcProvider(rpcUrl));
  // const tokenContract = new ethers.Contract(token, ERC20_ABI, wallet);
  // const tx = await tokenContract.transfer(toWallet, toContractUnits(amount));
  // return { txHash: tx.hash, status: "submitted" };

  return {
    txHash: `queued_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    status: "queued",
  };
}

// ─── Notify ───────────────────────────────────────────────
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
//  ROUTING LOGIC: Transaction Wallet → Escrow Wallet
// ═══════════════════════════════════════════════════════════
//
//  FLOW (Fiat via Stripe/Coinbase/Transak):
//   1. Processor converts fiat to stablecoin
//   2. ALL funds land in Transaction Fee Wallet
//   3. Transaction Wallet deducts:
//      - TrustLock platform fee (1.5% fiat / 1.0% crypto)
//      - Processor fee (retained by processor, already deducted)
//      - Jurisdiction taxes (VAT/GST from invoice)
//      - Escrow deposit fee (0.5%)
//   4. Remaining escrow principal → Escrow Wallet
//
//  FLOW (Crypto Direct Pay):
//   1. Buyer sends USDC/USDT to Transaction Fee Wallet
//   2. Transaction Wallet deducts:
//      - TrustLock platform fee (1.0%)
//      - Jurisdiction taxes (from invoice, if applicable)
//      - Escrow deposit fee (0.5%)
//   3. Remaining escrow principal → Escrow Wallet
//
//  FLOW (Release to Vendor):
//   1. Escrow Wallet releases funds
//   2. Deducts escrow release fee (1.0%) → trickles to Transaction Wallet
//   3. Net amount → Vendor
//
//  FLOW (Refund):
//   1. Escrow Wallet returns 100% to buyer
//   2. No trickle-down, no fees
// ═══════════════════════════════════════════════════════════

interface RoutingResult {
  action: string;
  transactionId: string;
  grossAmount: number;
  // Fee deductions at Transaction Wallet
  platformFee: number;
  processorFee: number;
  escrowDepositFee: number;
  taxAmount: number;
  taxType: string;
  totalDeductions: number;
  // What moves
  transactionWalletRetains: number;
  escrowWalletReceives: number;
  // On-chain transfers
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
      processor,      // stripe | coinbase | transak | direct
      paymentMethod,   // card | bank_transfer | mobile_money | crypto
      verifiedAmount,  // actual amount received (post-processor)
    } = body;

    if (!action) return json({ error: "action is required" }, 400);
    if (!transactionId) return json({ error: "transactionId is required" }, 400);

    const supabase = getSupabase();

    // ── Fetch transaction + tax breakdown ─────────────
    const { data: tx, error: txErr } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (txErr || !tx) return json({ error: "Transaction not found" }, 404);

    const isCrypto = paymentMethod === "crypto" || processor === "direct";
    const usedProcessor = processor || (isCrypto ? "direct" : "stripe");
    const token = USDC_ADDRESS; // Default to USDC

    // ══════════════════════════════════════════════════
    //  ACTION: ROUTE_INBOUND — Funds received, route to escrow
    // ══════════════════════════════════════════════════
    if (action === "route_inbound") {
      const grossAmount = verifiedAmount || tx.amount;
      const taxBreakdown = tx.tax_breakdown as Record<string, unknown> | null;

      // 1) Platform fee
      const platformRate = isCrypto ? FEE_RATES.platform_crypto : FEE_RATES.platform_fiat;
      const platformFee = round(grossAmount * (platformRate / 100));

      // 2) Processor fee (already deducted by processor for fiat, 0 for direct)
      const processorRate = FEE_RATES.processor[usedProcessor] || 0;
      const processorFee = usedProcessor === "direct" ? 0 : round(grossAmount * (processorRate / 100));

      // 3) Escrow deposit fee (0.5% at checkout)
      const escrowDepositFee = round(grossAmount * (FEE_RATES.escrow_deposit / 100));

      // 4) Jurisdiction taxes (from tax_breakdown on invoice)
      let taxAmount = 0;
      let taxType = "None";
      if (taxBreakdown) {
        taxAmount = round(Number(taxBreakdown.tax_amount || 0) + Number(taxBreakdown.tariff_amount || 0));
        taxType = String(taxBreakdown.tax_type || "None");
      }

      // 5) Calculate what Transaction Wallet retains vs forwards
      const totalDeductions = round(platformFee + escrowDepositFee + taxAmount);
      // For fiat: processor already took their cut, so we work with what arrived
      // For direct crypto: full amount arrived, we deduct everything
      const escrowPrincipal = round(grossAmount - totalDeductions);

      if (escrowPrincipal <= 0) {
        return json({
          error: "Escrow principal would be zero or negative after fee deductions",
          breakdown: { grossAmount, platformFee, processorFee, escrowDepositFee, taxAmount, totalDeductions },
        }, 400);
      }

      // 6) Execute on-chain transfer: Transaction Wallet → Escrow Wallet
      const routingTransfer = await transferOnChain(
        WALLETS.transaction.address,
        WALLETS.escrow.address,
        escrowPrincipal,
        token,
        `Escrow principal for TX ${tx.tx_id}`
      );

      // 7) Record the routing in the transaction
      await supabase
        .from("transactions")
        .update({
          status: "locked",
          fee: totalDeductions,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transactionId);

      // 8) Notify both parties
      await notify(
        supabase, tx.vendor_id,
        "Funds Secured in Escrow",
        `$${escrowPrincipal.toFixed(2)} has been routed to escrow for order #${tx.order_number || tx.tx_id}. ` +
        `Fees deducted: $${totalDeductions.toFixed(2)} (Platform: $${platformFee.toFixed(2)}, ` +
        `Escrow deposit: $${escrowDepositFee.toFixed(2)}${taxAmount > 0 ? `, Tax: $${taxAmount.toFixed(2)}` : ""}).`,
        "success", transactionId
      );

      await notify(
        supabase, tx.buyer_id,
        "Payment Secured",
        `Your payment of $${grossAmount.toFixed(2)} is secured. ` +
        `$${escrowPrincipal.toFixed(2)} held in escrow for order #${tx.order_number || tx.tx_id}.`,
        "success", transactionId
      );

      const result: RoutingResult = {
        action: "route_inbound",
        transactionId,
        grossAmount,
        platformFee,
        processorFee,
        escrowDepositFee,
        taxAmount,
        taxType,
        totalDeductions,
        transactionWalletRetains: round(platformFee + escrowDepositFee + taxAmount),
        escrowWalletReceives: escrowPrincipal,
        transfers: [{
          from: WALLETS.transaction.address,
          to: WALLETS.escrow.address,
          amount: escrowPrincipal,
          token,
          memo: `Escrow principal for TX ${tx.tx_id}`,
          txHash: routingTransfer.txHash,
          status: routingTransfer.status,
        }],
      };

      // Forward to escrow-bridge to lock on-chain
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
    //  ACTION: ROUTE_RELEASE — Release escrow to vendor
    // ══════════════════════════════════════════════════
    if (action === "route_release") {
      const escrowPrincipal = tx.amount - (tx.fee || 0);

      // Escrow release fee (1.0%) — trickles to Transaction Wallet
      const escrowReleaseFee = round(escrowPrincipal * (FEE_RATES.escrow_release / 100));
      const vendorPayout = round(escrowPrincipal - escrowReleaseFee);

      // Transfer 1: Escrow fee → Transaction Wallet (trickle-down)
      const trickleTransfer = await transferOnChain(
        WALLETS.escrow.address,
        WALLETS.transaction.address,
        escrowReleaseFee,
        token,
        `Escrow release fee trickle-down for TX ${tx.tx_id}`
      );

      // Transfer 2: Net payout → Vendor (or to off-ramp for fiat conversion)
      // In production, this goes to vendor's wallet or to off-ramp bridge
      const vendorWallet = body.vendorWallet || WALLETS.transaction.address; // Placeholder
      const payoutTransfer = await transferOnChain(
        WALLETS.escrow.address,
        vendorWallet,
        vendorPayout,
        token,
        `Vendor payout for TX ${tx.tx_id}`
      );

      await supabase
        .from("transactions")
        .update({
          status: "released",
          released_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", transactionId);

      // Forward to escrow-bridge for on-chain release
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
        `$${vendorPayout.toFixed(2)} released to your account. Escrow fee: $${escrowReleaseFee.toFixed(2)}.`,
        "success", transactionId
      );

      await notify(
        supabase, tx.buyer_id,
        "Order Completed",
        `Funds for order #${tx.order_number || tx.tx_id} released to vendor.`,
        "info", transactionId
      );

      return json({
        success: true,
        action: "route_release",
        transactionId,
        escrowPrincipal,
        escrowReleaseFee,
        vendorPayout,
        trickleToTransactionWallet: escrowReleaseFee,
        transfers: [
          {
            from: WALLETS.escrow.address,
            to: WALLETS.transaction.address,
            amount: escrowReleaseFee,
            token,
            memo: "Escrow fee trickle-down",
            txHash: trickleTransfer.txHash,
            status: trickleTransfer.status,
          },
          {
            from: WALLETS.escrow.address,
            to: vendorWallet,
            amount: vendorPayout,
            token,
            memo: "Vendor payout",
            txHash: payoutTransfer.txHash,
            status: payoutTransfer.status,
          },
        ],
      });
    }

    // ══════════════════════════════════════════════════
    //  ACTION: ROUTE_REFUND — Full refund from escrow
    // ══════════════════════════════════════════════════
    if (action === "route_refund") {
      const escrowPrincipal = tx.amount - (tx.fee || 0);
      // No fees on refund — 100% back to buyer
      const buyerWallet = body.buyerWallet || "buyer_pending";

      const refundTransfer = await transferOnChain(
        WALLETS.escrow.address,
        buyerWallet,
        escrowPrincipal,
        token,
        `Refund for TX ${tx.tx_id}`
      );

      await supabase
        .from("transactions")
        .update({
          status: "refunded",
          updated_at: new Date().toISOString(),
        })
        .eq("id", transactionId);

      // Forward to escrow-bridge
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
        "Refund Processed",
        `Full refund of $${escrowPrincipal.toFixed(2)} initiated for order #${tx.order_number || tx.tx_id}. No fees charged.`,
        "success", transactionId
      );

      return json({
        success: true,
        action: "route_refund",
        transactionId,
        refundAmount: escrowPrincipal,
        feesCharged: 0,
        transfers: [{
          from: WALLETS.escrow.address,
          to: buyerWallet,
          amount: escrowPrincipal,
          token,
          memo: "Full refund — zero fees",
          txHash: refundTransfer.txHash,
          status: refundTransfer.status,
        }],
      });
    }

    // ══════════════════════════════════════════════════
    //  ACTION: ROUTE_SPLIT — Dispute arbitration split
    // ══════════════════════════════════════════════════
    if (action === "route_split") {
      const { buyerShare, vendorShare } = body;
      if (buyerShare == null || vendorShare == null) {
        return json({ error: "buyerShare and vendorShare (0-1) are required" }, 400);
      }

      const escrowPrincipal = tx.amount - (tx.fee || 0);
      const buyerAmount = round(escrowPrincipal * buyerShare);
      const vendorGross = round(escrowPrincipal * vendorShare);

      // Escrow fee ONLY on vendor's share
      const vendorEscrowFee = round(vendorGross * (FEE_RATES.escrow_release / 100));
      const vendorNet = round(vendorGross - vendorEscrowFee);

      const transfers = [];

      // 1) Escrow fee → Transaction Wallet
      if (vendorEscrowFee > 0) {
        const trickle = await transferOnChain(
          WALLETS.escrow.address, WALLETS.transaction.address,
          vendorEscrowFee, token,
          `Split escrow fee for TX ${tx.tx_id}`
        );
        transfers.push({
          from: WALLETS.escrow.address,
          to: WALLETS.transaction.address,
          amount: vendorEscrowFee,
          token, memo: "Split escrow fee trickle-down",
          txHash: trickle.txHash, status: trickle.status,
        });
      }

      // 2) Buyer refund portion
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
          token, memo: "Buyer arbitration share",
          txHash: buyerTx.txHash, status: buyerTx.status,
        });
      }

      // 3) Vendor net payout
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
          token, memo: "Vendor arbitration share (net of fee)",
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
            action: "split", transactionId,
            buyerAmount, vendorAmount: vendorNet,
          }),
        });
      } catch (e) {
        console.warn("Escrow bridge split forward failed:", e);
      }

      await notify(supabase, tx.buyer_id,
        "Dispute Resolved", `You receive $${buyerAmount.toFixed(2)} from arbitration.`, "info", transactionId);
      await notify(supabase, tx.vendor_id,
        "Dispute Resolved", `You receive $${vendorNet.toFixed(2)} (fee: $${vendorEscrowFee.toFixed(2)}).`, "info", transactionId);

      return json({
        success: true,
        action: "route_split",
        transactionId,
        escrowPrincipal,
        buyerAmount,
        vendorGross,
        vendorEscrowFee,
        vendorNet,
        trickleToTransactionWallet: vendorEscrowFee,
        transfers,
      });
    }

    // ══════════════════════════════════════════════════
    //  ACTION: ROUTE_MILESTONE — Release single milestone
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

      // ── Fractional fee model ──────────────────────────
      // Instead of charging 1% on each milestone's amount,
      // we split the total 1% fee evenly across all milestones.
      // e.g. 5 milestones → 0.2% per milestone release.
      const { count: totalMilestoneCount } = await supabase
        .from("transaction_milestones")
        .select("id", { count: "exact", head: true })
        .eq("transaction_id", transactionId);

      const mCount = totalMilestoneCount || 1;
      const totalEscrowFee = round(tx.amount * (FEE_RATES.escrow_release / 100)); // 1% of full principal
      const fractionalFee = round(totalEscrowFee / mCount);

      // Count how many milestones are already completed (before this one)
      const { count: alreadyCompleted } = await supabase
        .from("transaction_milestones")
        .select("id", { count: "exact", head: true })
        .eq("transaction_id", transactionId)
        .eq("status", "completed");

      const priorCompleted = alreadyCompleted || 0;
      const isLastMilestone = (priorCompleted + 1) === mCount;
      // On last milestone, absorb any rounding remainder so total = exactly 1%
      const feesAlreadyCharged = round(fractionalFee * priorCompleted);
      const escrowFee = isLastMilestone
        ? round(totalEscrowFee - feesAlreadyCharged)
        : fractionalFee;
      const vendorNet = round(milestoneAmount - escrowFee);

      const transfers = [];

      // Trickle escrow fee → Transaction Wallet
      if (escrowFee > 0) {
        const trickle = await transferOnChain(
          WALLETS.escrow.address, WALLETS.transaction.address,
          escrowFee, token,
          `Milestone ${milestone.title} escrow fee for TX ${tx.tx_id}`
        );
        transfers.push({
          from: WALLETS.escrow.address, to: WALLETS.transaction.address,
          amount: escrowFee, token,
          memo: `Milestone escrow fee trickle-down`,
          txHash: trickle.txHash, status: trickle.status,
        });
      }

      // Vendor payout for this milestone
      const vendorWallet = body.vendorWallet || "vendor_pending";
      const payoutTx = await transferOnChain(
        WALLETS.escrow.address, vendorWallet,
        vendorNet, token,
        `Milestone "${milestone.title}" payout for TX ${tx.tx_id}`
      );
      transfers.push({
        from: WALLETS.escrow.address, to: vendorWallet,
        amount: vendorNet, token,
        memo: `Milestone payout`,
        txHash: payoutTx.txHash, status: payoutTx.status,
      });

      // Update milestone status
      await supabase
        .from("transaction_milestones")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", milestoneId);

      // Check if all milestones completed
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

      // Forward to escrow-bridge for on-chain milestone release
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
        `$${vendorNet.toFixed(2)} released for milestone "${milestone.title}" (fee: $${escrowFee.toFixed(2)}).`,
        "success", transactionId);

      return json({
        success: true,
        action: "route_milestone",
        transactionId,
        milestoneId,
        milestoneAmount,
        escrowFee,
        vendorNet,
        trickleToTransactionWallet: escrowFee,
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
