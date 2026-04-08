import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResp(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // JWT validation
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResp({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims) {
    return jsonResp({ error: "Unauthorized" }, 401);
  }
  const vendorId = claimsData.claims.sub as string;

  const admin = createClient(supabaseUrl, serviceKey);

  // GET: list pending contracts
  if (req.method === "GET") {
    const { data, error } = await admin
      .from("pre_order_contracts")
      .select("*")
      .eq("vendor_id", vendorId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) return jsonResp({ error: error.message }, 500);
    return jsonResp({ contracts: data });
  }

  if (req.method !== "POST") {
    return jsonResp({ error: "Method not allowed" }, 405);
  }

  const body = await req.json();
  const { action } = body;

  // Fetch vendor profile name
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", vendorId)
    .single();
  const vendorName = profile?.full_name || "";

  // ── sign_single ──
  if (action === "sign_single") {
    const { contract_id, typed_name } = body;
    if (!contract_id || !typed_name) {
      return jsonResp({ error: "contract_id and typed_name are required" }, 400);
    }

    if (vendorName && normalizeName(typed_name) !== normalizeName(vendorName)) {
      return jsonResp({ error: "Typed name does not match your profile name", expected: vendorName }, 400);
    }

    const { data: contract } = await admin
      .from("pre_order_contracts")
      .select("id, status, buyer_typed_name, buyer_id")
      .eq("id", contract_id)
      .eq("vendor_id", vendorId)
      .single();

    if (!contract) return jsonResp({ error: "Contract not found" }, 404);
    if (contract.status !== "pending" && contract.status !== "buyer_signed") {
      return jsonResp({ error: "Contract is not in a signable state" }, 400);
    }

    const newStatus = contract.buyer_typed_name ? "fully_signed" : "vendor_signed";

    const { error: updErr } = await admin
      .from("pre_order_contracts")
      .update({
        vendor_typed_name: typed_name.trim(),
        vendor_signed_at: new Date().toISOString(),
        is_vendor_auto_signed: false,
        status: newStatus,
      })
      .eq("id", contract_id);

    if (updErr) return jsonResp({ error: updErr.message }, 500);

    // Notify buyer if exists
    if (contract.buyer_id) {
      await admin.from("notifications").insert({
        user_id: contract.buyer_id,
        title: "Vendor signed your contract",
        message: `${vendorName || "The vendor"} has signed the pre-order contract. ${newStatus === "fully_signed" ? "The contract is now fully executed." : "Your signature is still needed."}`,
        type: "info",
        related_entity_type: "pre_order_contract",
        related_entity_id: contract_id,
      });
    }

    return jsonResp({ success: true, contract_id, status: newStatus });
  }

  // ── accept_all ──
  if (action === "accept_all") {
    if (!vendorName) {
      return jsonResp({ error: "Vendor profile name is required for batch signing" }, 400);
    }

    const { data: pending } = await admin
      .from("pre_order_contracts")
      .select("id, buyer_typed_name, buyer_id")
      .eq("vendor_id", vendorId)
      .eq("status", "pending");

    if (!pending || pending.length === 0) {
      return jsonResp({ success: true, signed: 0, message: "No pending contracts" });
    }

    const now = new Date().toISOString();
    let signed = 0;

    for (const c of pending) {
      const newStatus = c.buyer_typed_name ? "fully_signed" : "vendor_signed";

      const { error: updErr } = await admin
        .from("pre_order_contracts")
        .update({
          vendor_typed_name: vendorName,
          vendor_signed_at: now,
          is_vendor_auto_signed: false,
          status: newStatus,
        })
        .eq("id", c.id);

      if (!updErr) {
        signed++;
        if (c.buyer_id) {
          await admin.from("notifications").insert({
            user_id: c.buyer_id,
            title: "Vendor signed your contract",
            message: `${vendorName} has signed the pre-order contract. ${newStatus === "fully_signed" ? "The contract is now fully executed." : "Your signature is still needed."}`,
            type: "info",
            related_entity_type: "pre_order_contract",
            related_entity_id: c.id,
          });
        }
      }
    }

    return jsonResp({ success: true, signed, total: pending.length });
  }

  // ── reject ──
  if (action === "reject") {
    const { contract_id, reason } = body;
    if (!contract_id) return jsonResp({ error: "contract_id is required" }, 400);

    const { data: contract } = await admin
      .from("pre_order_contracts")
      .select("id, buyer_id")
      .eq("id", contract_id)
      .eq("vendor_id", vendorId)
      .single();

    if (!contract) return jsonResp({ error: "Contract not found" }, 404);

    const { error: updErr } = await admin
      .from("pre_order_contracts")
      .update({ status: "declined" })
      .eq("id", contract_id);

    if (updErr) return jsonResp({ error: updErr.message }, 500);

    if (contract.buyer_id) {
      await admin.from("notifications").insert({
        user_id: contract.buyer_id,
        title: "Contract declined by vendor",
        message: `${vendorName || "The vendor"} has declined the pre-order contract.${reason ? ` Reason: ${reason}` : ""}`,
        type: "warning",
        related_entity_type: "pre_order_contract",
        related_entity_id: contract_id,
      });
    }

    return jsonResp({ success: true, contract_id, status: "declined" });
  }

  return jsonResp({ error: "Unknown action" }, 400);
});
