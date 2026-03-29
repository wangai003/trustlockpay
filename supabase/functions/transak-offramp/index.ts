import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();

    // ─── Webhook from Transak (POST from their servers) ───
    if (body.webhookData) {
      const { id, status, walletAddress, cryptoAmount, cryptocurrency, network, fiatAmount, fiatCurrency } = body.webhookData;

      // Update payout_requests with Transak status
      const { data: existing } = await supabase
        .from("payout_requests")
        .select("*")
        .eq("payment_provider", "Transak")
        .eq("status", "processing")
        .limit(10);

      // Match by amount or Transak order ID in provider_details
      const matched = existing?.find((pr: Record<string, unknown>) => {
        const details = pr.provider_details as Record<string, unknown> | null;
        return details?.transak_order_id === id;
      });

      if (matched) {
        const newStatus = status === "COMPLETED" ? "completed"
          : status === "FAILED" ? "failed"
          : status === "EXPIRED" ? "failed"
          : "processing";

        await supabase
          .from("payout_requests")
          .update({
            status: newStatus,
            completed_at: newStatus === "completed" ? new Date().toISOString() : null,
            provider_details: {
              ...(matched.provider_details as Record<string, unknown> || {}),
              transak_status: status,
              transak_tx_hash: body.webhookData.transactionHash || null,
              crypto_amount: cryptoAmount,
              cryptocurrency,
              network,
              fiat_amount: fiatAmount,
              fiat_currency: fiatCurrency,
              wallet_address: walletAddress,
              updated_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", matched.id);

        // Notify user
        await supabase.from("notifications").insert({
          user_id: matched.user_id,
          title: newStatus === "completed" ? "Payout Completed" : newStatus === "failed" ? "Payout Failed" : "Payout Processing",
          message: newStatus === "completed"
            ? `Your payout of ${cryptoAmount} ${cryptocurrency} has been delivered to ${walletAddress} on ${network}.`
            : newStatus === "failed"
            ? `Your payout via Transak has failed. Please contact support with order ID: ${id}.`
            : `Your payout is still processing via Transak.`,
          type: newStatus === "completed" ? "success" : newStatus === "failed" ? "error" : "info",
          related_entity_type: "payout",
          related_entity_id: matched.id,
        });
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Initiate offramp (called from frontend) ───
    if (body.action === "initiate_offramp") {
      const {
        payout_request_id,
        user_id,
        amount,
        wallet_address,
        chain,
        fiat_currency,
      } = body;

      if (!payout_request_id || !wallet_address || !chain) {
        return new Response(
          JSON.stringify({ error: "payout_request_id, wallet_address, and chain are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const TRANSAK_API_KEY = Deno.env.get("TRANSAK_API_KEY");
      if (!TRANSAK_API_KEY) {
        // Queue for manual processing if no API key
        await supabase
          .from("payout_requests")
          .update({
            status: "queued_manual",
            provider_details: {
              wallet_address,
              chain,
              fiat_currency: fiat_currency || "USD",
              requires_transak_key: true,
              queued_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", payout_request_id);

        return new Response(
          JSON.stringify({
            success: true,
            status: "queued_manual",
            message: "Payout queued for manual processing. Transak API key not configured.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Map chain names to Transak network identifiers
      const CHAIN_MAP: Record<string, string> = {
        polygon: "polygon",
        ethereum: "ethereum",
        bsc: "bsc",
        arbitrum: "arbitrum",
        optimism: "optimism",
        avalanche: "avaxcchain",
        base: "base",
        solana: "solana",
        tron: "tron",
      };

      const transakNetwork = CHAIN_MAP[chain.toLowerCase()] || chain.toLowerCase();

      // Update payout request to processing
      await supabase
        .from("payout_requests")
        .update({
          status: "processing",
          payment_provider: "Transak",
          provider_details: {
            wallet_address,
            chain,
            transak_network: transakNetwork,
            fiat_currency: fiat_currency || "USD",
            initiated_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", payout_request_id);

      // In production, this would call the Transak API to create an offramp order
      // For now, return the widget URL for the user to complete
      const widgetUrl = `https://global.transak.com/?apiKey=${TRANSAK_API_KEY}` +
        `&cryptoCurrencyCode=USDC` +
        `&network=${transakNetwork}` +
        `&walletAddress=${encodeURIComponent(wallet_address)}` +
        `&defaultCryptoAmount=${amount}` +
        `&productsAvailable=SELL` +
        `&exchangeScreenTitle=TrustLock%20Payout`;

      return new Response(
        JSON.stringify({
          success: true,
          status: "processing",
          transak_widget_url: widgetUrl,
          transak_network: transakNetwork,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'initiate_offramp' or send webhook data." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
