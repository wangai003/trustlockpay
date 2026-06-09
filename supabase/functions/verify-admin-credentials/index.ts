// Server-side verification of an admin's locally-stored credentials.
// Used by the admin UI gates to prevent simple localStorage spoofing —
// the UI only renders elevated controls when this endpoint confirms
// the admin id + password match a real, active admin account.
//
// Returns: { ok: true, isChief: boolean, chiefRank: number|null, departmentSlug: string|null }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { adminId, password } = await req.json();
    if (!adminId || !password) return json({ ok: false, error: "Missing credentials" }, 400);

    const { data: pwOk } = await supabase.rpc("verify_admin_password", {
      _admin_id: adminId,
      _password: password,
    });
    if (!pwOk) return json({ ok: false, error: "Invalid credentials" }, 401);

    // Resolve chief rank (null if not a chief)
    const { data: chiefRow } = await supabase
      .from("chief_admin_config")
      .select("rank, department_slug")
      .eq("admin_id", adminId)
      .maybeSingle();

    return json({
      ok: true,
      isChief: !!chiefRow,
      chiefRank: chiefRow?.rank ?? null,
      departmentSlug: chiefRow?.department_slug ?? null,
    });
  } catch (e) {
    console.error("[verify-admin-credentials] error:", e);
    return json({ ok: false, error: "Internal server error" }, 500);
  }
});
