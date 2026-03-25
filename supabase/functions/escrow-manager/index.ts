import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Fee Constants ─────────────────────────────────────────
const FEE_RULES = {
  checkout_fiat: { trustlockRate: 1.5, escrowRate: 0.5, gasEstimate: 0.02 },
  checkout_crypto: { trustlockRate: 1.0, escrowRate: 0.5, gasEstimate: 0.02 },
  release: { trustlockRate: 0, escrowRate: 1.0, gasEstimate: 0.02 },
  refund: { trustlockRate: 0, escrowRate: 0, gasEstimate: 0.05 },
  split: { trustlockRate: 0, escrowRate: 1.0, gasEstimate: 0.04 },
} as const;

const PROCESSOR_RATES: Record<string, number> = {
  stripe: 2.9,
  coinbase: 1.5,
  yellow_card: 2.0,
  transak: 1.5,
  direct: 0,
};

// ─── Helpers ───────────────────────────────────────────────
function generateTxId(): string {
  return `TL-${Date.now()}`;
}

function generateConfirmationCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generatePayoutId(): string {
  return `PO-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

function calculateFees(
  amount: number,
  type: keyof typeof FEE_RULES,
  processorId = "direct",
  vendorShareFraction?: number
) {
  const rule = FEE_RULES[type];
  const processorRate = PROCESSOR_RATES[processorId] ?? 0;

  const trustlockFee = amount * (rule.trustlockRate / 100);
  const processorFee = processorId === "direct" ? 0 : amount * (processorRate / 100);

  let escrowFee = 0;
  if (rule.escrowRate > 0) {
    if (type === "split" && vendorShareFraction !== undefined) {
      escrowFee = amount * vendorShareFraction * (rule.escrowRate / 100);
    } else {
      escrowFee = amount * (rule.escrowRate / 100);
    }
  }

  const gasFee = rule.gasEstimate;
  const totalFees = trustlockFee + processorFee + escrowFee + gasFee;

  return {
    trustlockFee: round(trustlockFee),
    processorFee: round(processorFee),
    escrowFee: round(escrowFee),
    gasFee,
    totalFees: round(totalFees),
    netAmount: round(amount - totalFees),
    transactionWalletReceives: round(trustlockFee + processorFee),
    escrowWalletReceives: round(escrowFee),
    feePercentage: amount > 0 ? round((totalFees / amount) * 100) : 0,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function getWalletAddresses() {
  return {
    transactionWallet: Deno.env.get("TRANSACTION_WALLET_ADDRESS") ?? "0x7A3b...F92d",
    escrowWallet: Deno.env.get("ESCROW_WALLET_ADDRESS") ?? "0x4E1c...A83b",
  };
}

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// ─── Action Handlers ───────────────────────────────────────

async function lockFunds(body: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  const {
    buyer_id, vendor_id, amount, item,
    buyer_name, vendor_name, buyer_location, vendor_location,
    industry, processor = "direct", payment_type = "checkout_crypto",
  } = body;

  if (!buyer_id || !vendor_id || !amount) {
    return errorResponse("buyer_id, vendor_id, and amount are required", 400);
  }

  const numAmount = Number(amount);
  const feeType = payment_type === "checkout_fiat" ? "checkout_fiat" : "checkout_crypto";
  const fees = calculateFees(numAmount, feeType, String(processor));
  const txId = generateTxId();
  const confirmationCode = generateConfirmationCode();
  const autoRelease = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const wallets = getWalletAddresses();

  // Insert transaction
  const { data: transaction, error: txErr } = await supabase
    .from("transactions")
    .insert({
      tx_id: txId,
      buyer_id,
      vendor_id,
      amount: numAmount,
      fee: fees.totalFees,
      item: item ?? null,
      buyer_name: buyer_name ?? null,
      vendor_name: vendor_name ?? null,
      buyer_location: buyer_location ?? null,
      vendor_location: vendor_location ?? null,
      industry: industry ?? null,
      status: "locked",
      type: "product",
      auto_release_date: autoRelease,
    })
    .select()
    .single();

  if (txErr) return errorResponse(txErr.message, 500);

  // Insert carbon copy
  const { error: ccErr } = await supabase.from("order_carbon_copies").insert({
    transaction_id: transaction.id,
    order_number: txId,
    buyer_id,
    vendor_id,
    buyer_name: buyer_name ?? null,
    vendor_name: vendor_name ?? null,
    amount: numAmount,
    fee: fees.totalFees,
    item: item ?? null,
    status: "active",
    confirmation_code: confirmationCode,
  });

  if (ccErr) console.error("Carbon copy insert error:", ccErr.message);

  return jsonResponse({
    success: true,
    transaction,
    confirmationCode,
    feeBreakdown: fees,
    walletRouting: {
      transactionWallet: wallets.transactionWallet,
      transactionWalletReceives: fees.transactionWalletReceives,
      escrowWallet: wallets.escrowWallet,
      escrowWalletReceives: fees.escrowWalletReceives,
    },
    autoReleaseDate: autoRelease,
  });
}

async function releaseFunds(body: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  const { txId } = body;
  if (!txId) return errorResponse("txId is required", 400);

  // Fetch transaction
  const { data: tx, error: fetchErr } = await supabase
    .from("transactions")
    .select("*")
    .eq("tx_id", String(txId))
    .single();

  if (fetchErr || !tx) return errorResponse("Transaction not found", 404);
  if (tx.status === "released") return errorResponse("Already released", 400);

  const fees = calculateFees(tx.amount, "release");
  const wallets = getWalletAddresses();
  const now = new Date().toISOString();

  // Update transaction
  const { error: upErr } = await supabase
    .from("transactions")
    .update({ status: "released", released_date: now, updated_at: now })
    .eq("id", tx.id);

  if (upErr) return errorResponse(upErr.message, 500);

  // Create payout
  const payoutId = generatePayoutId();
  const { data: payout, error: poErr } = await supabase
    .from("payouts")
    .insert({
      payout_id: payoutId,
      vendor_id: tx.vendor_id,
      transaction_id: tx.id,
      amount: fees.netAmount,
      tx_id: tx.tx_id,
      method: "escrow_release",
      status: "completed",
      completed_at: now,
    })
    .select()
    .single();

  if (poErr) return errorResponse(poErr.message, 500);

  return jsonResponse({
    success: true,
    payout,
    feeBreakdown: fees,
    walletRouting: {
      transactionWallet: wallets.transactionWallet,
      transactionWalletReceives: fees.transactionWalletReceives,
      escrowWallet: wallets.escrowWallet,
      escrowWalletReceives: fees.escrowWalletReceives,
    },
  });
}

async function refundBuyer(body: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  const { txId, refundReason } = body;
  if (!txId) return errorResponse("txId is required", 400);

  const { data: tx, error: fetchErr } = await supabase
    .from("transactions")
    .select("*")
    .eq("tx_id", String(txId))
    .single();

  if (fetchErr || !tx) return errorResponse("Transaction not found", 404);

  // CRITICAL: escrow fee = 0 for refunds, gas only
  const fees = calculateFees(tx.amount, "refund");
  const now = new Date().toISOString();

  const { error: upErr } = await supabase
    .from("transactions")
    .update({ status: "refunded", updated_at: now })
    .eq("id", tx.id);

  if (upErr) return errorResponse(upErr.message, 500);

  const payoutId = generatePayoutId();
  const { data: refundPayout, error: poErr } = await supabase
    .from("payouts")
    .insert({
      payout_id: payoutId,
      vendor_id: tx.buyer_id, // refund goes to buyer
      transaction_id: tx.id,
      amount: fees.netAmount,
      tx_id: tx.tx_id,
      method: "refund",
      status: "completed",
      completed_at: now,
    })
    .select()
    .single();

  if (poErr) return errorResponse(poErr.message, 500);

  return jsonResponse({
    success: true,
    refundPayout,
    refundReason: refundReason ?? null,
    feeBreakdown: {
      ...fees,
      note: "Escrow fee waived on refunds. Only network gas charged.",
    },
  });
}

async function splitPayout(body: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  const { txId, vendorSharePercent, buyerSharePercent } = body;

  if (!txId || vendorSharePercent == null || buyerSharePercent == null) {
    return errorResponse("txId, vendorSharePercent, and buyerSharePercent are required", 400);
  }

  const vPct = Number(vendorSharePercent);
  const bPct = Number(buyerSharePercent);
  if (Math.abs(vPct + bPct - 100) > 0.01) {
    return errorResponse("Shares must total 100%", 400);
  }

  const { data: tx, error: fetchErr } = await supabase
    .from("transactions")
    .select("*")
    .eq("tx_id", String(txId))
    .single();

  if (fetchErr || !tx) return errorResponse("Transaction not found", 404);

  const vendorAmount = round(tx.amount * (vPct / 100));
  const buyerAmount = round(tx.amount * (bPct / 100));

  // Escrow fee (1%) applies ONLY to vendor's share; gas doubled
  const fees = calculateFees(tx.amount, "split", "direct", vPct / 100);
  const wallets = getWalletAddresses();
  const now = new Date().toISOString();

  // Update transaction
  const { error: upErr } = await supabase
    .from("transactions")
    .update({
      status: "split_resolved",
      released_date: now,
      updated_at: now,
    })
    .eq("id", tx.id);

  if (upErr) return errorResponse(upErr.message, 500);

  // Vendor payout (minus escrow fee on their share)
  const vendorNet = round(vendorAmount - fees.escrowWalletReceives - fees.gasFee / 2);
  const { data: vendorPayout, error: vpErr } = await supabase
    .from("payouts")
    .insert({
      payout_id: generatePayoutId(),
      vendor_id: tx.vendor_id,
      transaction_id: tx.id,
      amount: vendorNet,
      tx_id: tx.tx_id,
      method: "split_vendor",
      status: "completed",
      completed_at: now,
    })
    .select()
    .single();

  if (vpErr) return errorResponse(vpErr.message, 500);

  // Buyer payout (no escrow fee, half gas)
  const buyerNet = round(buyerAmount - fees.gasFee / 2);
  const { data: buyerPayout, error: bpErr } = await supabase
    .from("payouts")
    .insert({
      payout_id: generatePayoutId(),
      vendor_id: tx.buyer_id,
      transaction_id: tx.id,
      amount: buyerNet,
      tx_id: tx.tx_id,
      method: "split_buyer",
      status: "completed",
      completed_at: now,
    })
    .select()
    .single();

  if (bpErr) return errorResponse(bpErr.message, 500);

  return jsonResponse({
    success: true,
    vendorPayout,
    buyerPayout,
    split: { vendorPercent: vPct, buyerPercent: bPct, vendorAmount, buyerAmount },
    feeBreakdown: {
      ...fees,
      note: "Escrow fee (1%) applied only to vendor share. Gas doubled for dual disbursement.",
    },
    walletRouting: {
      escrowWallet: wallets.escrowWallet,
      escrowWalletReceives: fees.escrowWalletReceives,
    },
  });
}

async function checkAutoRelease() {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: expired, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("status", "locked")
    .lte("auto_release_date", now);

  if (error) return errorResponse(error.message, 500);
  if (!expired || expired.length === 0) {
    return jsonResponse({ success: true, released: 0, message: "No transactions due for auto-release." });
  }

  const results = [];
  for (const tx of expired) {
    const fees = calculateFees(tx.amount, "release");
    const payoutId = generatePayoutId();

    await supabase
      .from("transactions")
      .update({ status: "released", released_date: now, updated_at: now })
      .eq("id", tx.id);

    const { data: payout } = await supabase
      .from("payouts")
      .insert({
        payout_id: payoutId,
        vendor_id: tx.vendor_id,
        transaction_id: tx.id,
        amount: fees.netAmount,
        tx_id: tx.tx_id,
        method: "auto_release",
        status: "completed",
        completed_at: now,
      })
      .select()
      .single();

    results.push({ txId: tx.tx_id, payout, feeBreakdown: fees });
  }

  return jsonResponse({ success: true, released: results.length, results });
}

// ─── Response Helpers ──────────────────────────────────────
function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Main Handler ──────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "lock_funds":
        return await lockFunds(body);
      case "release_funds":
        return await releaseFunds(body);
      case "refund_buyer":
        return await refundBuyer(body);
      case "split_payout":
        return await splitPayout(body);
      case "check_auto_release":
        return await checkAutoRelease();
      default:
        return errorResponse(
          `Unknown action: ${action}. Valid: lock_funds, release_funds, refund_buyer, split_payout, check_auto_release`,
          400
        );
    }
  } catch (err) {
    console.error("escrow-manager error:", err);
    return errorResponse("Internal server error", 500);
  }
});
