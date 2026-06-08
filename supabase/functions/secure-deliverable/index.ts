import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userResult, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userResult.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userResult.user.id;

    const body = await req.json();
    const { action, deliverableId, mode } = body as {
      action: string;
      deliverableId: string;
      mode?: "preview" | "download";
    };

    if (!action || !deliverableId) {
      return new Response(JSON.stringify({ error: "Missing parameters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Load deliverable + parent transaction
    const { data: deliv, error: dErr } = await admin
      .from("transaction_deliverables")
      .select("id, transaction_id, vendor_id, buyer_id, storage_path, original_filename, mime_type, released_to_buyer")
      .eq("id", deliverableId)
      .maybeSingle();

    if (dErr || !deliv) {
      return new Response(JSON.stringify({ error: "Deliverable not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tx } = await admin
      .from("transactions")
      .select("buyer_id, vendor_id, status")
      .eq("id", deliv.transaction_id)
      .maybeSingle();

    const isVendor = userId === deliv.vendor_id || userId === tx?.vendor_id;
    const isBuyer = userId === deliv.buyer_id || userId === tx?.buyer_id;
    if (!isVendor && !isBuyer) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_url") {
      if (!deliv.storage_path) {
        return new Response(JSON.stringify({ error: "No file attached" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const wantsDownload = mode === "download";
      // Buyer can only download (no watermark removal) after release
      if (isBuyer && wantsDownload && !(deliv.released_to_buyer || tx?.status === "released")) {
        return new Response(
          JSON.stringify({
            error: "Download locked until funds are released to the vendor",
            locked: true,
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const ttl = wantsDownload ? 600 : 300; // 10m vs 5m
      const { data: signed, error: signErr } = await admin.storage
        .from("deliverables")
        .createSignedUrl(deliv.storage_path, ttl, {
          download: wantsDownload ? deliv.original_filename || true : false,
        });
      if (signErr || !signed) {
        return new Response(JSON.stringify({ error: signErr?.message || "Sign failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          url: signed.signedUrl,
          mode: wantsDownload ? "download" : "preview",
          filename: deliv.original_filename,
          mime_type: deliv.mime_type,
          released: deliv.released_to_buyer || tx?.status === "released",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
