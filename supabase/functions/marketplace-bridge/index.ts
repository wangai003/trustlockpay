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

// ─── Platform API Key Verification ────────────────────────
async function verifyPlatformApiKey(supabase: ReturnType<typeof getSupabase>, apiKey: string) {
  // Simple hash-based lookup (in production use bcrypt)
  const { data } = await supabase
    .from("platform_api_keys")
    .select("*")
    .eq("api_key_hash", apiKey)
    .eq("is_active", true)
    .single();
  return data;
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
        sso_token,
        platform_api_key,
      } = body;

      if (!vendor_id || !amount || !item || !buyer_email) {
        return json({ error: "vendor_id, amount, item, and buyer_email are required" }, 400);
      }

      const numAmount = Number(amount);
      if (numAmount <= 0) return json({ error: "Amount must be positive" }, 400);

      const supabase = getSupabase();
      const platformConfig = MARKETPLACE_PLATFORMS[platform] || MARKETPLACE_PLATFORMS.custom;

      // Check for platform API key and resolve platform fee
      let platformFeePercent = 0;
      let platformId: string | null = null;
      if (platform_api_key) {
        const platformRecord = await verifyPlatformApiKey(supabase, platform_api_key);
        if (platformRecord) {
          platformFeePercent = Number(platformRecord.platform_fee_percent) || 0;
          platformId = platformRecord.id;
        }
      }

      // ── Identity Bridge: resolve buyer ──
      let resolvedBuyerId: string | null = null;

      if (platformConfig.identityBridge === "sso_passthrough" && sso_token) {
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
        platform_id: platformId,
        platform_fee_percent: platformFeePercent,
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
          platform_fee_percent: platformFeePercent,
        },
      };

      const checkoutResult = await callCheckoutWidget(checkoutPayload);

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
          platform_fee: platformFeePercent > 0 ? `${platformFeePercent}% (${platformConfig.name} commission)` : "none",
          layering: platformConfig.feeLayering,
          note: platformConfig.feeLayering === "additive"
            ? "TrustLock's 1.5% escrow fee is shown separately from the marketplace's own fees."
            : "TrustLock's fee is included in the displayed total.",
        },
      });
    }

    // ══════════════════════════════════════════════════
    //  ACTION: INGEST_CART — Multi-vendor cart with items from different vendors
    // ══════════════════════════════════════════════════
    if (action === "ingest_cart") {
      const {
        platform, platform_api_key,
        marketplace_order_id,
        buyer_name, buyer_email, buyer_phone, buyer_location,
        items, // Array of { vendor_id, vendor_ref, item, amount, product_id, category }
      } = body;

      if (!buyer_email || !items || !Array.isArray(items) || items.length === 0) {
        return json({ error: "buyer_email and items[] array are required" }, 400);
      }
      if (items.length > 50) {
        return json({ error: "Maximum 50 items per cart" }, 400);
      }

      const supabase = getSupabase();
      const cartId = crypto.randomUUID();

      // Resolve platform
      let platformFeePercent = 0;
      let platformId: string | null = null;
      if (platform_api_key) {
        const platformRecord = await verifyPlatformApiKey(supabase, platform_api_key);
        if (platformRecord) {
          platformFeePercent = Number(platformRecord.platform_fee_percent) || 0;
          platformId = platformRecord.id;
        }
      }

      // Group items by vendor
      const vendorGroups: Record<string, typeof items> = {};
      for (const item of items) {
        const vendorKey = item.vendor_id || item.vendor_ref || "unknown";
        if (!vendorGroups[vendorKey]) vendorGroups[vendorKey] = [];
        vendorGroups[vendorKey].push(item);
      }

      // Resolve buyer
      let resolvedBuyerId: string | null = null;
      if (buyer_email) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", buyer_email)
          .single();
        resolvedBuyerId = profile?.id || null;
      }

      const results: Record<string, unknown>[] = [];

      for (const [vendorKey, vendorItems] of Object.entries(vendorGroups)) {
        const totalAmount = vendorItems.reduce((sum, i) => sum + Number(i.amount || 0), 0);
        const itemNames = vendorItems.map(i => i.item || i.product_id || "Item").join(", ");

        // Check if vendor exists
        let vendorId: string | null = null;
        const { data: vendorProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", vendorKey)
          .single();
        vendorId = vendorProfile?.id || null;

        // Create a transaction for this vendor's items
        const txId = `TL-CART-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        const { data: tx, error: txErr } = await supabase
          .from("transactions")
          .insert({
            tx_id: txId,
            vendor_id: vendorId,
            buyer_id: resolvedBuyerId,
            buyer_name: buyer_name || "Marketplace Buyer",
            item: itemNames,
            amount: totalAmount,
            status: "pending",
            industry: "ecommerce",
            cart_id: cartId,
            platform_id: platformId,
            metadata: {
              marketplace_order_id,
              platform: platform || "custom",
              vendor_ref: vendorKey,
              line_items: vendorItems,
              platform_fee_percent: platformFeePercent,
              buyer_email,
            },
          })
          .select("id, tx_id")
          .single();

        if (txErr) {
          results.push({ vendor_ref: vendorKey, error: txErr.message });
          continue;
        }

        // Generate claim token if vendor not on platform
        let claimInfo: Record<string, unknown> | null = null;
        if (!vendorId) {
          const vendorItem = vendorItems[0];
          const { data: token } = await supabase
            .from("vendor_claim_tokens")
            .insert({
              vendor_email: vendorItem.vendor_email || null,
              vendor_name: vendorItem.vendor_name || vendorKey,
              platform: platform || "custom",
              marketplace_vendor_id: vendorKey,
              transaction_id: tx?.id,
              platform_id: platformId,
              industry: vendorItem.category || "ecommerce",
            })
            .select("token")
            .single();

          if (token) {
            const baseUrl = Deno.env.get("SITE_URL") || "https://trustlockpay.lovable.app";
            claimInfo = {
              claim_url: `${baseUrl}/vendor/claim?token=${token.token}`,
              token: token.token,
              expires_in_days: 30,
            };
          }
        }

        results.push({
          vendor_ref: vendorKey,
          vendor_registered: !!vendorId,
          transaction_id: tx?.id,
          tx_id: tx?.tx_id,
          amount: totalAmount,
          items_count: vendorItems.length,
          claim: claimInfo,
        });
      }

      return json({
        success: true,
        action: "ingest_cart",
        cart_id: cartId,
        vendor_count: Object.keys(vendorGroups).length,
        total_amount: items.reduce((s, i) => s + Number(i.amount || 0), 0),
        platform_fee_percent: platformFeePercent,
        transactions: results,
        buyer_resolved: !!resolvedBuyerId,
      });
    }

    // ══════════════════════════════════════════════════
    //  ACTION: BULK_ONBOARD — Register many vendors at once
    // ══════════════════════════════════════════════════
    if (action === "bulk_onboard") {
      const { platform_api_key, vendors } = body;
      // vendors: Array of { vendor_name, vendor_email, external_ref, industry }

      if (!platform_api_key) {
        return json({ error: "platform_api_key is required for bulk operations" }, 400);
      }
      if (!vendors || !Array.isArray(vendors) || vendors.length === 0) {
        return json({ error: "vendors[] array is required" }, 400);
      }
      if (vendors.length > 500) {
        return json({ error: "Maximum 500 vendors per batch" }, 400);
      }

      const supabase = getSupabase();

      // Verify platform API key
      const platformRecord = await verifyPlatformApiKey(supabase, platform_api_key);
      if (!platformRecord) {
        return json({ error: "Invalid or inactive platform API key" }, 403);
      }

      const baseUrl = Deno.env.get("SITE_URL") || "https://trustlockpay.lovable.app";
      const results: Record<string, unknown>[] = [];
      let created = 0;
      let skipped = 0;
      let existing = 0;

      for (const v of vendors) {
        const externalRef = v.external_ref || v.vendor_email || v.vendor_name;
        if (!externalRef) {
          results.push({ vendor: v, status: "skipped", reason: "No external_ref, email, or name" });
          skipped++;
          continue;
        }

        // Check if already exists by email
        if (v.vendor_email) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", v.vendor_email)
            .single();
          if (profile) {
            results.push({ external_ref: externalRef, status: "already_registered", vendor_id: profile.id });
            existing++;
            continue;
          }
        }

        // Check if claim token already exists for this platform+ref
        const { data: existingToken } = await supabase
          .from("vendor_claim_tokens")
          .select("token, status")
          .eq("marketplace_vendor_id", externalRef)
          .eq("platform", platformRecord.platform_name)
          .single();

        if (existingToken) {
          results.push({
            external_ref: externalRef,
            status: existingToken.status === "pending" ? "token_exists" : existingToken.status,
            claim_url: `${baseUrl}/vendor/claim?token=${existingToken.token}`,
          });
          skipped++;
          continue;
        }

        // Create claim token
        const { data: token, error: tokenErr } = await supabase
          .from("vendor_claim_tokens")
          .insert({
            vendor_email: v.vendor_email || null,
            vendor_name: v.vendor_name || externalRef,
            platform: platformRecord.platform_name,
            marketplace_vendor_id: externalRef,
            platform_id: platformRecord.id,
            industry: v.industry || "ecommerce",
          })
          .select("token")
          .single();

        if (tokenErr) {
          results.push({ external_ref: externalRef, status: "error", reason: tokenErr.message });
          continue;
        }

        results.push({
          external_ref: externalRef,
          status: "token_created",
          claim_url: `${baseUrl}/vendor/claim?token=${token.token}`,
          token: token.token,
        });
        created++;
      }

      return json({
        success: true,
        action: "bulk_onboard",
        platform: platformRecord.platform_name,
        summary: { total: vendors.length, created, skipped, already_registered: existing },
        vendors: results,
      });
    }

    // ══════════════════════════════════════════════════
    //  ACTION: PLATFORM_DASHBOARD — Aggregate stats for a platform
    // ══════════════════════════════════════════════════
    if (action === "platform_dashboard") {
      const { platform_api_key } = body;
      if (!platform_api_key) {
        return json({ error: "platform_api_key is required" }, 400);
      }

      const supabase = getSupabase();
      const platformRecord = await verifyPlatformApiKey(supabase, platform_api_key);
      if (!platformRecord) {
        return json({ error: "Invalid or inactive platform API key" }, 403);
      }

      // Count transactions for this platform
      const { count: txCount } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("platform_id", platformRecord.id);

      // Sum GMV
      const { data: gmvData } = await supabase
        .from("transactions")
        .select("amount")
        .eq("platform_id", platformRecord.id);
      const totalGmv = (gmvData || []).reduce((s, t) => s + Number(t.amount || 0), 0);

      // Count claim tokens
      const { count: totalTokens } = await supabase
        .from("vendor_claim_tokens")
        .select("*", { count: "exact", head: true })
        .eq("platform_id", platformRecord.id);

      const { count: claimedTokens } = await supabase
        .from("vendor_claim_tokens")
        .select("*", { count: "exact", head: true })
        .eq("platform_id", platformRecord.id)
        .eq("status", "claimed");

      const { count: pendingTokens } = await supabase
        .from("vendor_claim_tokens")
        .select("*", { count: "exact", head: true })
        .eq("platform_id", platformRecord.id)
        .eq("status", "pending");

      // Transaction status breakdown
      const { data: statusData } = await supabase
        .from("transactions")
        .select("status")
        .eq("platform_id", platformRecord.id);

      const statusBreakdown: Record<string, number> = {};
      for (const t of statusData || []) {
        statusBreakdown[t.status] = (statusBreakdown[t.status] || 0) + 1;
      }

      return json({
        success: true,
        platform: platformRecord.platform_name,
        platform_fee_percent: platformRecord.platform_fee_percent,
        stats: {
          total_transactions: txCount || 0,
          total_gmv: totalGmv,
          platform_revenue_estimate: totalGmv * (Number(platformRecord.platform_fee_percent) / 100),
          vendors: {
            total_tokens: totalTokens || 0,
            claimed: claimedTokens || 0,
            pending: pendingTokens || 0,
          },
          transaction_status: statusBreakdown,
        },
      });
    }

    // ══════════════════════════════════════════════════
    //  ACTION: SETTLEMENT_CALLBACK
    // ══════════════════════════════════════════════════
    if (action === "settlement_callback") {
      const { transaction_id, integration_id, vendor_id } = body;
      if (!transaction_id) {
        return json({ error: "transaction_id is required" }, 400);
      }

      const supabase = getSupabase();

      const { data: tx } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", transaction_id)
        .single();

      if (!tx) return json({ error: "Transaction not found" }, 404);

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

      const settlementPayload = {
        event: "trustlock.settlement",
        transaction_id: tx.id,
        tx_id: tx.tx_id,
        status: tx.status,
        amount: tx.amount,
        fee: tx.fee,
        settled_at: tx.released_date || new Date().toISOString(),
        cart_id: tx.cart_id || null,
        marketplace_order_id: (tx.metadata as Record<string, unknown>)?.marketplace_order_id || null,
      };

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
    //  ACTION: LIST_PLATFORMS
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
    //  ACTION: LIST_INTEGRATIONS
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
    //  ACTION: GENERATE_VENDOR_INVITE
    // ══════════════════════════════════════════════════
    if (action === "generate_vendor_invite") {
      const { vendor_email, vendor_name, platform, integration_id, transaction_id, marketplace_vendor_id } = body;
      if (!platform) return json({ error: "platform is required" }, 400);

      const supabase = getSupabase();
      const baseUrl = Deno.env.get("SITE_URL") || "https://trustlockpay.lovable.app";

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

      await supabase.from("notifications").insert({
        user_id: "00000000-0000-0000-0000-000000000000",
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
    //  ACTION: CLAIM_VENDOR
    // ══════════════════════════════════════════════════
    if (action === "claim_vendor") {
      const { token: claimToken, user_id } = body;
      if (!claimToken || !user_id) {
        return json({ error: "token and user_id are required" }, 400);
      }

      const supabase = getSupabase();

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

      await supabase
        .from("vendor_claim_tokens")
        .update({
          claimed_by: user_id,
          status: "claimed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", claim.id);

      if (claim.transaction_id) {
        await supabase
          .from("transactions")
          .update({ vendor_id: user_id })
          .eq("id", claim.transaction_id);
      }

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
    //  ACTION: LOOKUP_TOKEN
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

    // ══════════════════════════════════════════════════
    //  ACTION: FAST_TRACK_CONNECT
    // ══════════════════════════════════════════════════
    if (action === "fast_track_connect") {
      const { platform, seller_id, api_key, store_url, seller_email, seller_name } = body;
      if (!platform || !seller_id) {
        return json({ error: "platform and seller_id are required" }, 400);
      }

      const allowedPlatforms = ["shopify", "amazon"];
      if (!allowedPlatforms.includes(platform)) {
        return json({
          error: `Fast-track only available for: ${allowedPlatforms.join(", ")}. Use generate_vendor_invite for other platforms.`,
        }, 400);
      }

      const supabase = getSupabase();
      const platformConfig = MARKETPLACE_PLATFORMS[platform];

      let existingVendorId: string | null = null;
      if (seller_email) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", seller_email)
          .single();
        existingVendorId = profile?.id || null;
      }

      if (existingVendorId) {
        const integrationId = `mkt_ft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        const { data: existing } = await supabase
          .from("vendor_settings")
          .select("id, marketplace_integrations")
          .eq("vendor_id", existingVendorId)
          .single();

        const integrations = (existing?.marketplace_integrations as Record<string, unknown>[]) || [];
        integrations.push({
          integration_id: integrationId,
          platform,
          platform_name: platformConfig.name,
          store_url: store_url || null,
          seller_id,
          api_key_hash: api_key ? `ft_${api_key.slice(0, 6)}...` : null,
          identity_bridge: "api_key",
          fee_layering: platformConfig.feeLayering,
          default_order_type: platformConfig.defaultOrderType,
          industry: platformConfig.industry,
          fast_track: true,
          status: "active",
          created_at: new Date().toISOString(),
        });

        if (existing) {
          await supabase
            .from("vendor_settings")
            .update({ marketplace_integrations: integrations })
            .eq("id", existing.id);
        } else {
          await supabase.from("vendor_settings").insert({
            vendor_id: existingVendorId,
            marketplace_integrations: integrations,
          });
        }

        await supabase.from("notifications").insert({
          user_id: existingVendorId,
          type: "success",
          title: `${platformConfig.name} Store Connected`,
          message: `Your ${platformConfig.name} store has been linked via fast-track. Marketplace orders will appear in your dashboard.`,
          is_action_required: false,
          action_url: "/trustlock/vendor/marketplace-orders",
        });

        return json({
          success: true,
          fast_track: true,
          already_registered: true,
          vendor_id: existingVendorId,
          integration_id: integrationId,
          platform: platformConfig.name,
          message: "Store connected via fast-track. No claim token needed.",
        });
      }

      const { data: token, error: tokenErr } = await supabase
        .from("vendor_claim_tokens")
        .insert({
          vendor_email: seller_email || null,
          vendor_name: seller_name || null,
          platform,
          marketplace_vendor_id: seller_id,
        })
        .select("token")
        .single();

      if (tokenErr) {
        return json({ error: "Failed to create fast-track token", details: tokenErr.message }, 500);
      }

      const baseUrl = Deno.env.get("SITE_URL") || "https://trustlockpay.lovable.app";
      const claimUrl = `${baseUrl}/vendor/claim?token=${token.token}&fast_track=true`;

      return json({
        success: true,
        fast_track: true,
        already_registered: false,
        claim_url: claimUrl,
        token: token.token,
        platform: platformConfig.name,
        message: "Seller not yet registered. Fast-track claim link generated (90-day expiry vs standard 30-day).",
        instructions: seller_email
          ? `Send this link to ${seller_email} — they can sign up and instantly connect their ${platformConfig.name} store.`
          : `Share this fast-track link with the seller to connect their ${platformConfig.name} store.`,
      });
    }

    return json({
      error: `Unknown action: ${action}. Supported: register, ingest_order, ingest_cart, bulk_onboard, platform_dashboard, settlement_callback, list_platforms, list_integrations, generate_vendor_invite, claim_vendor, lookup_token, fast_track_connect`,
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
