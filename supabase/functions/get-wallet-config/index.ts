// Returns PUBLIC custodian wallet + contract addresses. Safe to expose —
// these are on-chain public addresses, not private keys.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const transaction = Deno.env.get("TRANSACTION_WALLET_ADDRESS") || "";
  const escrow = Deno.env.get("ESCROW_WALLET_ADDRESS") || "";
  const escrowContract = Deno.env.get("ESCROW_CONTRACT_ADDRESS") || "";
  const registryContract = Deno.env.get("REGISTRY_CONTRACT_ADDRESS") || "";
  const forwarderContract = Deno.env.get("FORWARDER_CONTRACT_ADDRESS") || "";

  return new Response(
    JSON.stringify({
      transaction,
      escrow,
      escrowContract,
      registryContract,
      forwarderContract,
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
