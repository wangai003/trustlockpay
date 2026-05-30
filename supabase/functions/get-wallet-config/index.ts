// Returns PUBLIC custodian wallet addresses. Safe to expose — these are
// on-chain public addresses, not private keys.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const transaction = Deno.env.get("TRANSACTION_WALLET_ADDRESS") || "";
  const escrow = Deno.env.get("ESCROW_WALLET_ADDRESS") || "";

  return new Response(
    JSON.stringify({
      transaction,
      escrow,
      network: "polygon",
      chainId: 137,
    }),
    {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
    },
  );
});
