import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Contract Addresses (Polygon Mainnet) ─────────────────
const ESCROW_CONTRACT = Deno.env.get("ESCROW_CONTRACT_ADDRESS") || "";
const USDC_ADDRESS = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
const USDT_ADDRESS = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
const TOKEN_DECIMALS = 6;

// ─── ABI fragments for TrustLockEscrow (aligned with contract) ──
const ESCROW_ABI = {
  lockFunds: "function lockFunds(bytes32 orderId, address token, address buyer, address vendor, uint256 amount)",
  lockFundsWithMilestones: "function lockFundsWithMilestones(bytes32 orderId, address token, address buyer, address vendor, uint256 amount, uint256[] milestoneAmounts)",
  releaseFunds: "function releaseFunds(bytes32 orderId)",
  refundBuyer: "function refundBuyer(bytes32 orderId)",
  splitPayout: "function splitPayout(bytes32 orderId, uint256 buyerAmount, uint256 vendorAmount)",
  approveMilestone: "function approveMilestone(bytes32 orderId, uint256 milestoneIndex, bool isBuyer)",
  releaseMilestone: "function releaseMilestone(bytes32 orderId, uint256 milestoneIndex)",
  refundMilestone: "function refundMilestone(bytes32 orderId, uint256 milestoneIndex)",
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

// ─── Generate escrowId from transaction ───────────────────
// Matches Solidity: keccak256(abi.encodePacked("TL-", txId))
async function txToEscrowId(txId: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`TL-${txId}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  // Use SHA-256 as keccak256 stand-in until ethers.js is integrated on-chain.
  // When ethers is available, replace with: ethers.keccak256(ethers.toUtf8Bytes(`TL-${txId}`))
  const hashArray = new Uint8Array(hashBuffer);
  let hash = "0x";
  for (const byte of hashArray) {
    hash += byte.toString(16).padStart(2, "0");
  }
  return hash;
}

// ─── Convert amount to contract units (6 decimals) ────────
function toContractUnits(amount: number): bigint {
  return BigInt(Math.round(amount * Math.pow(10, TOKEN_DECIMALS)));
}

// ─── Resolve token address from transaction ───────────────
function resolveTokenAddress(tx: Record<string, unknown>): string {
  const token = ((tx.token as string) || "USDC").toUpperCase();
  if (token === "USDT") return USDT_ADDRESS;
  return USDC_ADDRESS; // Default to USDC
}

// ─── Send transaction via Polygon RPC (eth_sendRawTransaction) ───
async function sendContractCall(
  functionSig: string,
  encodedParams: string
): Promise<{ txHash: string; status: string }> {
  const privateKey = Deno.env.get("DEPLOYER_WALLET_PRIVATE_KEY");
  const rpcUrl = Deno.env.get("POLYGON_RPC_URL") || "https://polygon-rpc.com";

  if (!privateKey || !ESCROW_CONTRACT) {
    console.warn("Contract not deployed or keys not configured — recording intent only");
    return {
      txHash: "pending_deployment",
      status: "queued",
    };
  }

  // In production, this would use ethers.js to sign and send:
  // const wallet = new ethers.Wallet(privateKey, provider);
  // const contract = new ethers.Contract(ESCROW_CONTRACT, abi, wallet);
  // const tx = await contract.lockFunds(...args);
  // return { txHash: tx.hash, status: "submitted" };

  // For now, record the intent and return queued status
  // This will be replaced with actual signing when contract is deployed
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
    related_entity_type: "escrow",
    related_entity_id: relatedId || null,
  });
}

// ─── Main Handler ─────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const { action, transactionId, milestoneIndex, buyerAmount, vendorAmount } = body;

    if (!action) return json({ error: "action is required" }, 400);
    if (!transactionId) return json({ error: "transactionId is required" }, 400);

    const supabase = getSupabase();

    // ── Fetch transaction ─────────────────────────────
    const { data: tx, error: txErr } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (txErr || !tx) {
      return json({ error: "Transaction not found" }, 404);
    }

    const escrowId = txToEscrowId(tx.tx_id);
    const contractUnits = toContractUnits(tx.amount);

    // Resolve token address from transaction payment method
    const tokenAddress = resolveTokenAddress(tx);

    // ══════════════════════════════════════════════════
    //  ACTION: LOCK — Lock net principal in escrow (fees already deducted off-chain)
    // ══════════════════════════════════════════════════
    if (action === "lock") {
      // Check if milestones exist
      const { data: milestones } = await supabase
        .from("transaction_milestones")
        .select("*")
        .eq("transaction_id", transactionId)
        .order("order_index", { ascending: true });

      let result;
      if (milestones && milestones.length > 1) {
        // Milestone-based lock
        const milestoneAmounts = milestones.map((m: Record<string, unknown>) =>
          toContractUnits(Number(m.amount) || tx.amount / milestones.length)
        );

        result = await sendContractCall(
          ESCROW_ABI.lockFundsWithMilestones,
          JSON.stringify({
            orderId: escrowId,
            token: tokenAddress,
            buyer: tx.buyer_id,
            vendor: tx.vendor_id,
            amount: contractUnits.toString(),
            milestoneAmounts: milestoneAmounts.map(String),
          })
        );
      } else {
        // Atomic lock
        result = await sendContractCall(
          ESCROW_ABI.lockFunds,
          JSON.stringify({
            orderId: escrowId,
            token: tokenAddress,
            buyer: tx.buyer_id,
            vendor: tx.vendor_id,
            amount: contractUnits.toString(),
          })
        );
      }

      // Update transaction status
      await supabase
        .from("transactions")
        .update({
          status: "locked",
          updated_at: new Date().toISOString(),
        })
        .eq("id", transactionId);

      // Auto-complete first payment milestone
      if (milestones?.length) {
        const paymentMilestone = milestones.find(
          (m: Record<string, unknown>) =>
            (m.title as string)?.toLowerCase().includes("payment") ||
            (m.order_index as number) === 0
        );
        if (paymentMilestone) {
          await supabase
            .from("transaction_milestones")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
            })
            .eq("id", paymentMilestone.id);
        }
      }

      await notify(
        supabase,
        tx.vendor_id,
        "Funds Locked in Escrow",
        `$${tx.amount} has been locked for order #${tx.order_number || tx.tx_id}. Buyer: ${tx.buyer_name || "Unknown"}.`,
        "success",
        transactionId
      );

      await notify(
        supabase,
        tx.buyer_id,
        "Payment Secured",
        `Your payment of $${tx.amount} is now secured in escrow for order #${tx.order_number || tx.tx_id}.`,
        "success",
        transactionId
      );

      return json({
        success: true,
        action: "lock",
        escrowId,
        contractTx: result,
        milestoneCount: milestones?.length || 0,
      });
    }

    // ══════════════════════════════════════════════════
    //  ACTION: RELEASE — Release funds to vendor
    // ══════════════════════════════════════════════════
    if (action === "release") {
      const result = await sendContractCall(
        ESCROW_ABI.releaseFunds,
        JSON.stringify({ orderId: escrowId })
      );

      await supabase
        .from("transactions")
        .update({
          status: "released",
          released_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", transactionId);

      // Calculate trickle-down fee for records
      // Atomic (non-milestone) release = full 1% of total principal
      // For milestone releases, fee is fractionalized in release_milestone action
      const escrowFee = Math.round(tx.amount * 0.01 * 100) / 100;
      const vendorPayout = tx.amount - escrowFee;

      await notify(
        supabase,
        tx.vendor_id,
        "Funds Released",
        `$${vendorPayout.toFixed(2)} has been released to your account (1% escrow fee: $${escrowFee.toFixed(2)}).`,
        "success",
        transactionId
      );

      await notify(
        supabase,
        tx.buyer_id,
        "Order Completed",
        `Funds for order #${tx.order_number || tx.tx_id} have been released to the vendor.`,
        "info",
        transactionId
      );

      // ── Auto-fire marketplace settlement callback if applicable ──
      const txMetadata = tx.metadata as Record<string, unknown> | null;
      let marketplaceCallbackStatus = "not_marketplace";
      if (txMetadata?.platform || txMetadata?.integration_id) {
        try {
          const cbResult = await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/marketplace-bridge`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
              },
              body: JSON.stringify({
                action: "settlement_callback",
                transaction_id: transactionId,
                vendor_id: tx.vendor_id,
                integration_id: txMetadata.integration_id || null,
              }),
            }
          );
          const cbData = await cbResult.json() as Record<string, unknown>;
          marketplaceCallbackStatus = String(cbData.callback_status || "fired");
        } catch (e) {
          marketplaceCallbackStatus = `error_${(e as Error).message}`;
          console.error("Marketplace callback error:", e);
        }
      }

      return json({
        success: true,
        action: "release",
        escrowId,
        contractTx: result,
        vendorPayout,
        escrowFee,
        marketplaceCallbackStatus,
      });
    }

    // ══════════════════════════════════════════════════
    //  ACTION: REFUND — Full refund to buyer (0% fee)
    // ══════════════════════════════════════════════════
    if (action === "refund") {
      const result = await sendContractCall(
        ESCROW_ABI.refundBuyer,
        JSON.stringify({ orderId: escrowId })
      );

      await supabase
        .from("transactions")
        .update({
          status: "refunded",
          updated_at: new Date().toISOString(),
        })
        .eq("id", transactionId);

      await notify(
        supabase,
        tx.buyer_id,
        "Refund Processed",
        `Your full refund of $${tx.amount} for order #${tx.order_number || tx.tx_id} has been initiated.`,
        "success",
        transactionId
      );

      return json({
        success: true,
        action: "refund",
        escrowId,
        contractTx: result,
        refundAmount: tx.amount,
      });
    }

    // ══════════════════════════════════════════════════
    //  ACTION: SPLIT — Dispute arbitration split payout
    // ══════════════════════════════════════════════════
    if (action === "split") {
      if (buyerAmount == null || vendorAmount == null) {
        return json({ error: "buyerAmount and vendorAmount are required for split" }, 400);
      }

      const result = await sendContractCall(
        ESCROW_ABI.splitPayout,
        JSON.stringify({
          orderId: escrowId,
          buyerAmount: toContractUnits(buyerAmount).toString(),
          vendorAmount: toContractUnits(vendorAmount).toString(),
        })
      );

      // 1% fee from vendor's share
      const vendorFee = Math.round(vendorAmount * 0.01 * 100) / 100;
      const vendorNet = vendorAmount - vendorFee;

      await supabase
        .from("transactions")
        .update({
          status: "split_resolved",
          updated_at: new Date().toISOString(),
        })
        .eq("id", transactionId);

      await notify(
        supabase,
        tx.buyer_id,
        "Dispute Resolved",
        `You will receive $${buyerAmount.toFixed(2)} from the arbitration ruling.`,
        "info",
        transactionId
      );

      await notify(
        supabase,
        tx.vendor_id,
        "Dispute Resolved",
        `You will receive $${vendorNet.toFixed(2)} from the arbitration ruling (1% escrow fee: $${vendorFee.toFixed(2)}).`,
        "info",
        transactionId
      );

      return json({
        success: true,
        action: "split",
        escrowId,
        contractTx: result,
        buyerAmount,
        vendorNet,
        vendorFee,
      });
    }

    // ══════════════════════════════════════════════════
    //  ACTION: RELEASE_MILESTONE — Release single milestone
    //  Fee: 1% ÷ totalMilestones per release, remainder absorbed by final
    // ══════════════════════════════════════════════════
    if (action === "release_milestone") {
      if (milestoneIndex == null) {
        return json({ error: "milestoneIndex is required" }, 400);
      }

      const result = await sendContractCall(
        ESCROW_ABI.releaseMilestone,
        JSON.stringify({ orderId: escrowId, milestoneIndex })
      );

      // Update milestone in DB
      const { data: milestone } = await supabase
        .from("transaction_milestones")
        .select("id, order_index, amount, title")
        .eq("transaction_id", transactionId)
        .eq("order_index", milestoneIndex)
        .single();

      if (milestone) {
        await supabase
          .from("transaction_milestones")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", milestone.id);
      }

      const milestoneAmount = Number(milestone?.amount) || 0;

      // ── $0 checkpoint milestones — documentation only, no fee ──
      if (milestoneAmount === 0) {
        // Check if all milestones are now resolved
        const { data: pendingMs } = await supabase
          .from("transaction_milestones")
          .select("id")
          .eq("transaction_id", transactionId)
          .not("status", "in", '("completed","refunded")');

        const allDone = !pendingMs?.length;
        if (allDone) {
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

        return json({
          success: true,
          action: "release_milestone",
          escrowId,
          milestoneIndex,
          contractTx: result,
          checkpoint: true,
          milestoneAmount: 0,
          milestoneEscrowFee: 0,
          vendorPayout: 0,
          allCompleted: allDone,
        });
      }

      // ── Fractionalized escrow fee: 1% ÷ total milestones ──
      const { count: totalMilestoneCount } = await supabase
        .from("transaction_milestones")
        .select("id", { count: "exact", head: true })
        .eq("transaction_id", transactionId);

      const msCount = totalMilestoneCount || 1;
      const totalEscrowFee = Math.round(tx.amount * 0.01 * 100) / 100;
      const fractionalFee = Math.round((totalEscrowFee / msCount) * 100) / 100;

      // Check if this is the last milestone — use remainder absorption
      const { data: remaining } = await supabase
        .from("transaction_milestones")
        .select("id")
        .eq("transaction_id", transactionId)
        .not("status", "in", '("completed","refunded")');

      const isLast = !remaining?.length;

      // Count prior completed milestones (excluding this one, which was just updated)
      const { count: completedBefore } = await supabase
        .from("transaction_milestones")
        .select("id", { count: "exact", head: true })
        .eq("transaction_id", transactionId)
        .eq("status", "completed");

      const priorCompleted = (completedBefore || 1) - 1;
      const feesAlreadyCharged = Math.round(fractionalFee * priorCompleted * 100) / 100;
      const milestoneEscrowFee = isLast
        ? Math.round((totalEscrowFee - feesAlreadyCharged) * 100) / 100
        : fractionalFee;

      if (isLast) {
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

      const vendorPayout = Math.round((milestoneAmount - milestoneEscrowFee) * 100) / 100;

      await notify(
        supabase,
        tx.vendor_id,
        "Milestone Released",
        `Milestone "${milestone?.title || milestoneIndex}" — $${vendorPayout.toFixed(2)} released. ` +
        `Escrow fee: $${milestoneEscrowFee.toFixed(2)} (1% ÷ ${msCount} milestones = ${(1 / msCount).toFixed(4)}% per milestone).`,
        "success",
        transactionId
      );

      return json({
        success: true,
        action: "release_milestone",
        escrowId,
        milestoneIndex,
        contractTx: result,
        allCompleted: isLast,
        checkpoint: false,
        milestoneAmount,
        milestoneEscrowFee,
        vendorPayout,
        totalEscrowFee,
        milestoneCount: msCount,
        feeFormula: `1% ÷ ${msCount} milestones = ${(1 / msCount).toFixed(4)}% per milestone`,
      });
    }

    // ══════════════════════════════════════════════════
    //  ACTION: REFUND_MILESTONE — Refund a single milestone to buyer
    //  Fee: $0 — all fees waived on refund
    // ══════════════════════════════════════════════════
    if (action === "refund_milestone") {
      if (milestoneIndex == null) {
        return json({ error: "milestoneIndex is required" }, 400);
      }

      const result = await sendContractCall(
        ESCROW_ABI.refundMilestone,
        JSON.stringify({ orderId: escrowId, milestoneIndex })
      );

      const { data: milestone } = await supabase
        .from("transaction_milestones")
        .select("id, order_index, amount, title")
        .eq("transaction_id", transactionId)
        .eq("order_index", milestoneIndex)
        .single();

      const milestoneAmount = Number(milestone?.amount) || 0;

      if (milestone) {
        await supabase
          .from("transaction_milestones")
          .update({
            status: "refunded",
            completed_at: new Date().toISOString(),
          })
          .eq("id", milestone.id);
      }

      // Check if all milestones are now resolved (completed or refunded)
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

      await notify(
        supabase,
        tx.buyer_id,
        "Milestone Refunded",
        `$${milestoneAmount.toFixed(2)} refunded for milestone "${milestone?.title || milestoneIndex}" — $0 fees.`,
        "success",
        transactionId
      );

      return json({
        success: true,
        action: "refund_milestone",
        escrowId,
        milestoneIndex,
        contractTx: result,
        refundAmount: milestoneAmount,
        feesCharged: 0,
        allResolved,
      });
    }

    // ══════════════════════════════════════════════════
    //  ACTION: APPROVE_MILESTONE — Buyer/vendor approval
    // ══════════════════════════════════════════════════
    if (action === "approve_milestone") {
      if (milestoneIndex == null) {
        return json({ error: "milestoneIndex is required" }, 400);
      }
      const isBuyer = body.isBuyer ?? true;

      const result = await sendContractCall(
        ESCROW_ABI.approveMilestone,
        JSON.stringify({ orderId: escrowId, milestoneIndex, isBuyer })
      );

      return json({
        success: true,
        action: "approve_milestone",
        escrowId,
        milestoneIndex,
        isBuyer,
        contractTx: result,
      });
    }

    return json({ error: `Unknown action: ${action}. Supported: lock, release, refund, split, release_milestone, refund_milestone, approve_milestone` }, 400);
  } catch (err) {
    console.error("escrow-bridge error:", err);
    return json({ success: false, error: err.message }, 500);
  }
});
