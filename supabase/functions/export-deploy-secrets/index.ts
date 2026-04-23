// ⚠️ TEMPORARY ONE-TIME USE FUNCTION ⚠️
// Returns deployment secrets for local Hardhat use.
// Protected by a shared password. DELETE THIS FUNCTION AFTER USE.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const password = body?.password;

    const EXPECTED = Deno.env.get("DEPLOY_EXPORT_PASSWORD");
    if (!EXPECTED) {
      return new Response(
        JSON.stringify({ error: "DEPLOY_EXPORT_PASSWORD not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!password || password !== EXPECTED) {
      // Constant-ish delay to slow brute force
      await new Promise((r) => setTimeout(r, 1500));
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const secrets = {
      DEPLOYER_WALLET_PRIVATE_KEY: Deno.env.get("DEPLOYER_WALLET_PRIVATE_KEY") ?? null,
      POLYGON_AMOY_RPC_URL: Deno.env.get("POLYGON_AMOY_RPC_URL") ?? null,
      POLYGON_RPC_URL: Deno.env.get("POLYGON_RPC_URL") ?? null,
      ESCROW_WALLET_ADDRESS: Deno.env.get("ESCROW_WALLET_ADDRESS") ?? null,
      TRANSACTION_WALLET_ADDRESS: Deno.env.get("TRANSACTION_WALLET_ADDRESS") ?? null,
      POLYGON_RELAYER_PRIVATE_KEY: Deno.env.get("POLYGON_RELAYER_PRIVATE_KEY") ?? null,
      POLYGONSCAN_API_KEY: Deno.env.get("POLYGONSCAN_API_KEY") ?? null,
    };

    const present = Object.fromEntries(
      Object.entries(secrets).map(([k, v]) => [k, v ? "✓ present" : "✗ missing"])
    );

    return new Response(
      JSON.stringify(
        {
          warning: "DELETE THIS FUNCTION IMMEDIATELY AFTER USE",
          summary: present,
          secrets,
        },
        null,
        2
      ),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message ?? String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
