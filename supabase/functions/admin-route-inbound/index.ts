// One-shot admin trigger to re-run wallet-routing-bridge route_inbound for a transaction.
// Auth: requires the caller's bearer to match SUPABASE_SERVICE_ROLE_KEY OR a shared
// ADMIN_REROUTE_TOKEN secret (so it can be invoked from tools that hold a different key).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isAuthorized(req: Request): boolean {
  const adminToken = req.headers.get("x-admin-token");
  const expectedToken = Deno.env.get("ADMIN_REROUTE_TOKEN");
  if (expectedToken && adminToken === expectedToken) return true;

  const authHeader = req.headers.get("Authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  return bearer.length > 0 && bearer === serviceKey;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!isAuthorized(req)) return json({ error: "Unauthorized" }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const {
    transactionId,
    action = "route_inbound",
    processor = "direct",
    paymentMethod = "crypto",
    verifiedAmount,
    network = "polygon",
    isTestnet = false,
    vendorWallet,
    buyerWallet,
  } = body || {};

  if (!transactionId) return json({ error: "transactionId is required" }, 400);

  const allowedActions = new Set([
    "route_inbound",
    "route_release",
    "route_refund",
    "route_split",
    "route_milestone",
    "route_refund_milestone",
    "route_principal_only",
  ]);
  if (!allowedActions.has(action)) return json({ error: `Unsupported action: ${action}` }, 400);

  const payload: Record<string, unknown> = {
    action,
    transactionId,
    network,
    isTestnet,
  };
  if (action === "route_inbound") {
    Object.assign(payload, { processor, paymentMethod, verifiedAmount });
  }
  if (vendorWallet) payload.vendorWallet = vendorWallet;
  if (buyerWallet) payload.buyerWallet = buyerWallet;

  const url = `${Deno.env.get("SUPABASE_URL")!}/functions/v1/wallet-routing-bridge`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
    },
    body: JSON.stringify(payload),
  });


  const text = await res.text();
  let parsed: unknown = text;
  try { parsed = JSON.parse(text); } catch { /* keep text */ }

  return json({ status: res.status, response: parsed }, res.ok ? 200 : 502);
});
