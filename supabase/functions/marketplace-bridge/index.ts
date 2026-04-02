import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

// ─── Supported Marketplace Platforms ──────────────────────
const MARKETPLACE_PLATFORMS: Record<string, {
  name: string;
  industry: string;
  defaultOrderType: "simple" | "milestone" | "hybrid";
  requiresInvoiceRef: boolean;
  supportsCallback: boolean;
  identityBridge: "sso_passthrough" | "email_match" | "guest";
  feeLayering: "additive" | "inclusive";
}> = {
  jumia: {
    name: "Jumia",
    industry: "ecommerce",
    defaultOrderType: "simple",
    requiresInvoiceRef: true,
    supportsCallback: true,
    identityBridge: "email_match",
    feeLayering: "additive",
  },
  jiji: {
    name: "Jiji",
    industry: "ecommerce",
    defaultOrderType: "simple",
    requiresInvoiceRef: false,
    supportsCallback: false,
    identityBridge: "guest",
    feeLayering: "additive",
  },
  amazon: {
    name: "Amazon",
    industry: "ecommerce",
    defaultOrderType: "simple",
    requiresInvoiceRef: true,
    supportsCallback: true,
    identityBridge: "sso_passthrough",
    feeLayering: "additive",
  },
  shopify: {
    name: "Shopify Storefront",
    industry: "ecommerce",
    defaultOrderType: "simple",
    requiresInvoiceRef: true,
    supportsCallback: true,
    identityBridge: "email_match",
    feeLayering: "additive",
  },
  kilimall: {
    name: "Kilimall",
    industry: "ecommerce",
    defaultOrderType: "simple",
    requiresInvoiceRef: true,
    supportsCallback: false,
    identityBridge: "email_match",
    feeLayering: "additive",
  },
  konga: {
    name: "Konga",
    industry: "ecommerce",
    defaultOrderType: "simple",
    requiresInvoiceRef: true,
    supportsCallback: true,
    identityBridge: "email_match",
    feeLayering: "additive",
  },
  custom: {
    name: "Custom Marketplace",
    industry: "ecommerce",
    defaultOrderType: "simple",
    requiresInvoiceRef: false,
    supportsCallback: true,
    identityBridge: "email_match",
    feeLayering: "additive",
  },
};

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
    const { action } = body;

    if (!action) return json({ error: "action is required" }, 400);

    // ══════════════════════════════════════════════════
    //  ACTION: REGISTER — Register a marketplace integration
    // ══════════════════════════════════════════════════
    if (action === "register") {
      const { vendor_id, platform, callback_url, api_key_hash, site_url } = body;
      if (!vendor_id || !platform) {
        return json({ error: "vendor_id and platform are required" }, 400);
      }

      const platformConfig = MARKETPLACE_PLATFORMS[platform] || MARKETPLACE_PLATFORMS.custom;
      const supabase = getSupabase();

      // Store marketplace integration in vendor_settings
      const { data: existing } = await supabase
        .from("vendor_settings")
        .select("id, marketplace_integrations")
        .eq("vendor_id", vendor_id)
        .single();

      const integrations = (existing?.marketplace_integrations as Record<string, unknown>[]) || [];
      const integrationId = `mkt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const newIntegration = {
        integration_id: integrationId,
        platform,
        platform_name: platformConfig.name,
        callback_url: callback_url || null,
        api_key_hash: api_key_hash || null,
        site_url: site_url || null,
        identity_bridge: platformConfig.identityBridge,
        fee_layering: platformConfig.feeLayering,
        default_order_type: platformConfig.defaultOrderType,
        industry: platformConfig.industry,
        requires_invoice_ref: platformConfig.requiresInvoiceRef,
        supports_callback: platformConfig.supportsCallback,
        status: "active",
        created_at: new Date().toISOString(),
      };

      integrations.push(newIntegration);

      if (existing) {
        await supabase
          .from("vendor_settings")
          .update({ marketplace_integrations: integrations })
          .eq("id", existing.id);
      } else {
        await supabase.from("vendor_settings").insert({
          vendor_id,
          marketplace_integrations: integrations,
        });
      }

      return json({
        success: true,
        integration_id: integrationId,
        platform: platformConfig.name,
        widget_mode: "marketplace",
        embed_snippet: generateEmbedSnippet(vendor_id, integrationId, platform),
        webhook_endpoint: `${Deno.env.get("SUPABASE_URL")}/functions/v1/marketplace-bridge`,
        instructions: {
          step1: "Add the embed snippet to your marketplace checkout page.",
          step2: platformConfig.supportsCallback
            ? `Set your settlement callback URL to: ${callback_url || "(configure callback_url)"}`
            : "This platform does not support callbacks — order status must be polled.",
          step3: "Pass pre-filled order data via URL params or postMessage API.",
        },
      });
    }

    // ══════════════════════════════════════════════════
    //  ACTION: INGEST_ORDER — Accept pre-filled order from marketplace
    // ══════════════════════════════════════════════════
    if (action === "ingest_order") {
      const {
        vendor_id, integration_id, platform,
        marketplace_order_id, marketplace_invoice_number,
        item, amount, currency,
        buyer_name, buyer_email, buyer_phone, buyer_location,
        payment_method, line_items,
        sso_token, // Optional SSO passthrough token
      } = body;

      if (!vendor_id || !amount || !item || !buyer_email) {
        return json({ error: "vendor_id, amount, item, and buyer_email are required" }, 400);
      }

      const numAmount = Number(amount);
      if (numAmount <= 0) return json({ error: "Amount must be positive" }, 400);

      const supabase = getSupabase();
      const platformConfig = MARKETPLACE_PLATFORMS[platform] || MARKETPLACE_PLATFORMS.custom;

      // ── Identity Bridge: resolve buyer ──
      let resolvedBuyerId: string | null = null;

      if (platformConfig.identityBridge === "sso_passthrough" && sso_token) {
        // Verify SSO token from marketplace (JWT decode — trusted marketplace)
        // For now, look up by email as fallback
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", buyer_email)
          .single();
        resolvedBuyerId = profile?.id || null;
      } else if (platformConfig.identityBridge === "email_match") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", buyer_email)
          .single();
        resolvedBuyerId = profile?.id || null;
      }
      // "guest" mode: resolvedBuyerId stays null

      // ── Forward to checkout-widget as marketplace mode ──
      const checkoutPayload = {
        action: "init_session",
        vendorId: vendor_id,
        amount: numAmount,
        item,
        buyerEmail: buyer_email,
        buyerName: buyer_name || "Marketplace Buyer",
        buyerLocation: buyer_location || "US",
        paymentMethod: payment_method || "card",
        buyer_id: resolvedBuyerId,
        industry: platformConfig.industry,
        order_type: platformConfig.defaultOrderType,
        // Marketplace metadata passed through
        marketplace_metadata: {
          platform,
          platform_name: platformConfig.name,
          integration_id: integration_id || null,
          marketplace_order_id: marketplace_order_id || null,
          marketplace_invoice_number: marketplace_invoice_number || null,
          currency: currency || "USD",
          line_items: line_items || null,
          identity_bridge: platformConfig.identityBridge,
          fee_layering: platformConfig.feeLayering,
          buyer_phone: buyer_phone || null,
        },
      };

      const checkoutResult = await callCheckoutWidget(checkoutPayload);

      // ── Augment response with marketplace context ──
      return json({
        success: true,
        mode: "marketplace",
        platform: platformConfig.name,
        marketplace_order_id: marketplace_order_id || null,
        marketplace_invoice_ref: marketplace_invoice_number || null,
        buyer_resolved: !!resolvedBuyerId,
        buyer_is_new: !resolvedBuyerId,
        checkout: checkoutResult,
        fee_disclosure: {
          escrow_fee: "1.5% (0.5% upfront + 1.0% at settlement)",
          layering: platformConfig.feeLayering,
          note: platformConfig.feeLayering === "additive"
            ? "TrustLock's 1.5% escrow fee is shown separately from the marketplace's own fees."
            : "TrustLock's fee is included in the displayed total.",
        },
      });
    }

    // ══════════════════════════════════════════════════
    //  ACTION: SETTLEMENT_CALLBACK — Notify marketplace of settlement
    // ══════════════════════════════════════════════════
    if (action === "settlement_callback") {
      const { transaction_id, integration_id, vendor_id } = body;
      if (!transaction_id) {
        return json({ error: "transaction_id is required" }, 400);
      }

      const supabase = getSupabase();

      // Fetch transaction
      const { data: tx } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", transaction_id)
        .single();

      if (!tx) return json({ error: "Transaction not found" }, 404);

      // Look up integration callback URL
      let callbackUrl: string | null = null;
      if (vendor_id || tx.vendor_id) {
        const { data: settings } = await supabase
          .from("vendor_settings")
          .select("marketplace_integrations")
          .eq("vendor_id", vendor_id || tx.vendor_id)
          .single();

        if (settings?.marketplace_integrations) {
          const integrations = settings.marketplace_integrations as Record<string, unknown>[];
          const integration = integration_id
            ? integrations.find((i) => i.integration_id === integration_id)
            : integrations[0];
          callbackUrl = (integration?.callback_url as string) || null;
        }
      }

      // Build settlement payload
      const settlementPayload = {
        event: "trustlock.settlement",
        transaction_id: tx.id,
        tx_id: tx.tx_id,
        status: tx.status,
        amount: tx.amount,
        fee: tx.fee,
        settled_at: tx.released_date || new Date().toISOString(),
        marketplace_order_id: (tx.metadata as Record<string, unknown>)?.marketplace_order_id || null,
      };

      // Fire callback if URL exists
      let callbackStatus = "no_callback_configured";
      if (callbackUrl) {
        try {
          const res = await fetch(callbackUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(settlementPayload),
          });
          callbackStatus = res.ok ? "delivered" : `failed_${res.status}`;
        } catch (err) {
          callbackStatus = `error_${(err as Error).message}`;
        }
      }

      return json({
        success: true,
        action: "settlement_callback",
        callback_status: callbackStatus,
        settlement: settlementPayload,
      });
    }

    // ══════════════════════════════════════════════════
    //  ACTION: LIST_PLATFORMS — Return supported marketplace platforms
    // ══════════════════════════════════════════════════
    if (action === "list_platforms") {
      const platforms = Object.entries(MARKETPLACE_PLATFORMS).map(([key, config]) => ({
        key,
        name: config.name,
        industry: config.industry,
        defaultOrderType: config.defaultOrderType,
        identityBridge: config.identityBridge,
        feeLayering: config.feeLayering,
        requiresInvoiceRef: config.requiresInvoiceRef,
        supportsCallback: config.supportsCallback,
      }));
      return json({ success: true, platforms });
    }

    // ══════════════════════════════════════════════════
    //  ACTION: LIST_INTEGRATIONS — Vendor's active integrations
    // ══════════════════════════════════════════════════
    if (action === "list_integrations") {
      const { vendor_id } = body;
      if (!vendor_id) return json({ error: "vendor_id is required" }, 400);

      const supabase = getSupabase();
      const { data: settings } = await supabase
        .from("vendor_settings")
        .select("marketplace_integrations")
        .eq("vendor_id", vendor_id)
        .single();

      return json({
        success: true,
        integrations: settings?.marketplace_integrations || [],
      });
    }

    // ══════════════════════════════════════════════════
    //  ACTION: GENERATE_VENDOR_INVITE — Create claim token for marketplace vendor
    // ══════════════════════════════════════════════════
    if (action === "generate_vendor_invite") {
      const { vendor_email, vendor_name, platform, integration_id, transaction_id, marketplace_vendor_id } = body;
      if (!platform) return json({ error: "platform is required" }, 400);

      const supabase = getSupabase();
      const baseUrl = Deno.env.get("SITE_URL") || "https://trustlockpay.lovable.app";

      // Check if vendor already has a TrustLock account (by email)
      let existingVendorId: string | null = null;
      if (vendor_email) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", vendor_email)
          .single();
        existingVendorId = profile?.id || null;
      }

      if (existingVendorId) {
        // Vendor already exists — link transaction directly
        if (transaction_id) {
          await supabase
            .from("transactions")
            .update({ vendor_id: existingVendorId })
            .eq("id", transaction_id);
        }
        return json({
          success: true,
          already_registered: true,
          vendor_id: existingVendorId,
          message: "Vendor already has a TrustLock account. Transaction linked automatically.",
        });
      }

      // Generate claim token
      const { data: token, error: tokenErr } = await supabase
        .from("vendor_claim_tokens")
        .insert({
          vendor_email: vendor_email || null,
          vendor_name: vendor_name || null,
          platform,
          integration_id: integration_id || null,
          transaction_id: transaction_id || null,
          marketplace_vendor_id: marketplace_vendor_id || null,
        })
        .select("token")
        .single();

      if (tokenErr) {
        return json({ error: "Failed to generate claim token", details: tokenErr.message }, 500);
      }

      const claimUrl = `${baseUrl}/vendor/claim?token=${token.token}`;

      // Notify admin about unclaimed marketplace vendor
      await supabase.from("notifications").insert({
        user_id: "00000000-0000-0000-0000-000000000000", // system placeholder
        type: "marketplace_vendor_invite",
        title: "New Marketplace Vendor Awaiting Claim",
        message: `${vendor_name || vendor_email || "Unknown vendor"} on ${platform} needs to claim their TrustLock account. Claim link: ${claimUrl}`,
        related_entity_type: "vendor_claim_token",
        related_entity_id: token.token,
        is_action_required: true,
      });

      return json({
        success: true,
        claim_url: claimUrl,
        token: token.token,
        vendor_email,
        platform,
        instructions: vendor_email
          ? `Send claim link to ${vendor_email}: ${claimUrl}`
          : `Share this claim link with the vendor: ${claimUrl}`,
      });
    }

    // ══════════════════════════════════════════════════
    //  ACTION: CLAIM_VENDOR — Vendor claims their marketplace account
    // ══════════════════════════════════════════════════
    if (action === "claim_vendor") {
      const { token: claimToken, user_id } = body;
      if (!claimToken || !user_id) {
        return json({ error: "token and user_id are required" }, 400);
      }

      const supabase = getSupabase();

      // Look up token
      const { data: claim } = await supabase
        .from("vendor_claim_tokens")
        .select("*")
        .eq("token", claimToken)
        .single();

      if (!claim) return json({ error: "Invalid or expired claim token" }, 404);
      if (claim.status !== "pending") return json({ error: "Token already claimed" }, 400);
      if (new Date(claim.expires_at) < new Date()) {
        await supabase
          .from("vendor_claim_tokens")
          .update({ status: "expired" })
          .eq("id", claim.id);
        return json({ error: "Claim token has expired" }, 410);
      }

      // Claim the token
      await supabase
        .from("vendor_claim_tokens")
        .update({
          claimed_by: user_id,
          status: "claimed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", claim.id);

      // Link any associated transaction to this vendor
      if (claim.transaction_id) {
        await supabase
          .from("transactions")
          .update({ vendor_id: user_id })
          .eq("id", claim.transaction_id);
      }

      // Link ALL pending transactions from this marketplace vendor
      // Look for other unclaimed tokens from the same platform vendor
      const { data: otherTokens } = await supabase
        .from("vendor_claim_tokens")
        .select("id, transaction_id")
        .eq("marketplace_vendor_id", claim.marketplace_vendor_id || "")
        .eq("status", "pending")
        .neq("id", claim.id);

      if (otherTokens?.length) {
        for (const t of otherTokens) {
          await supabase
            .from("vendor_claim_tokens")
            .update({ claimed_by: user_id, status: "claimed", updated_at: new Date().toISOString() })
            .eq("id", t.id);
          if (t.transaction_id) {
            await supabase
              .from("transactions")
              .update({ vendor_id: user_id })
              .eq("id", t.transaction_id);
          }
        }
      }

      // Notify the vendor
      await supabase.from("notifications").insert({
        user_id,
        type: "success",
        title: "Marketplace Account Claimed",
        message: `You've successfully claimed your ${claim.platform} vendor account on TrustLock. Marketplace orders will now appear in your dashboard.`,
        is_action_required: true,
        action_url: "/trustlock/vendor/marketplace-orders",
      });

      return json({
        success: true,
        claimed: true,
        platform: claim.platform,
        transactions_linked: (otherTokens?.length || 0) + (claim.transaction_id ? 1 : 0),
        message: "Account claimed. Configure your payout method to receive funds.",
      });
    }

    // ══════════════════════════════════════════════════
    //  ACTION: LOOKUP_TOKEN — Public token validation for claim page
    // ══════════════════════════════════════════════════
    if (action === "lookup_token") {
      const { token: lookupToken } = body;
      if (!lookupToken) return json({ error: "token is required" }, 400);

      const supabase = getSupabase();
      const { data: claim } = await supabase
        .from("vendor_claim_tokens")
        .select("vendor_name, vendor_email, platform, status, expires_at, marketplace_vendor_id")
        .eq("token", lookupToken)
        .single();

      if (!claim) return json({ error: "Invalid token" }, 404);

      return json({
        success: true,
        valid: claim.status === "pending" && new Date(claim.expires_at) > new Date(),
        status: claim.status,
        vendor_name: claim.vendor_name,
        vendor_email: claim.vendor_email,
        platform: claim.platform,
        expired: new Date(claim.expires_at) < new Date(),
      });
    }

    return json({
      error: `Unknown action: ${action}. Supported: register, ingest_order, settlement_callback, list_platforms, list_integrations, generate_vendor_invite, claim_vendor, lookup_token`,
    }, 400);
  } catch (err) {
    console.error("marketplace-bridge error:", err);
    return json({ success: false, error: (err as Error).message }, 500);
  }
});

// ─── Helpers ──────────────────────────────────────────────

async function callCheckoutWidget(payload: Record<string, unknown>): Promise<unknown> {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/checkout-widget`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
    },
    body: JSON.stringify(payload),
  });
  return res.json();
}

function generateEmbedSnippet(vendorId: string, integrationId: string, platform: string): string {
  const baseUrl = Deno.env.get("SITE_URL") || "https://trustlockpay.lovable.app";
  return `<!-- TrustLock Escrow Widget (Marketplace Mode) -->
<script>
  window.TrustLockConfig = {
    vendorId: "${vendorId}",
    integrationId: "${integrationId}",
    platform: "${platform}",
    mode: "marketplace",
    apiEndpoint: "${Deno.env.get("SUPABASE_URL")}/functions/v1/marketplace-bridge"
  };
</script>
<script src="${baseUrl}/widget/trustlock-marketplace.js" async></script>`;
}
