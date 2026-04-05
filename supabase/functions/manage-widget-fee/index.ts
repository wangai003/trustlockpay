import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WIDGET_INSTALL_FEE = 5.0;

type WidgetState = "never_installed" | "installed" | "disabled" | "deleted";
type Action = "get_state" | "install" | "enable" | "disable" | "delete" | "restore";
type ChargeMode = "immediate" | "next_cycle" | "none";

interface TransitionResult {
  fee: number;
  newState: WidgetState;
  chargeMode: ChargeMode;
}

function calculateTransition(current: WidgetState, action: Action): TransitionResult {
  switch (action) {
    case "install":
      if (current === "never_installed") {
        return { fee: WIDGET_INSTALL_FEE, newState: "installed", chargeMode: "immediate" };
      }
      return { fee: 0, newState: "installed", chargeMode: "none" };
    case "enable":
      return { fee: 0, newState: "installed", chargeMode: "none" };
    case "disable":
      return { fee: 0, newState: "disabled", chargeMode: "none" };
    case "delete":
      return { fee: 0, newState: "deleted", chargeMode: "none" };
    case "restore":
      if (current === "deleted") {
        return { fee: WIDGET_INSTALL_FEE, newState: "installed", chargeMode: "next_cycle" };
      }
      return { fee: 0, newState: "installed", chargeMode: "none" };
    default:
      return { fee: 0, newState: current, chargeMode: "none" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, site_id } = await req.json() as { action: Action; site_id?: string };
    const validActions: Action[] = ["get_state", "install", "enable", "disable", "delete", "restore"];
    if (!validActions.includes(action)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build query filter — per-site if site_id provided, otherwise legacy per-vendor
    const filterCol = site_id ? "site_id" : "vendor_id";
    const filterVal = site_id || user.id;

    // Fetch or create state row
    let { data: row, error: fetchErr } = await supabase
      .from("vendor_widget_fees")
      .select("*")
      .eq("vendor_id", user.id)
      .eq(site_id ? "site_id" : "vendor_id", site_id || user.id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    if (!row) {
      const insertPayload: Record<string, unknown> = { vendor_id: user.id };
      if (site_id) insertPayload.site_id = site_id;
      const { data: inserted, error: insertErr } = await supabase
        .from("vendor_widget_fees")
        .insert(insertPayload)
        .select()
        .single();
      if (insertErr) throw insertErr;
      row = inserted;
    }

    if (action === "get_state") {
      return new Response(JSON.stringify({
        success: true,
        fee: 0,
        chargeMode: "none",
        state: {
          widgetState: row.widget_state,
          installFeePaid: row.install_fee_paid,
          pendingRestorationFee: row.pending_restoration_fee,
          totalInstallFeesCharged: row.total_install_fees_charged,
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const currentState = row.widget_state as WidgetState;
    const { fee, newState, chargeMode } = calculateTransition(currentState, action);

    const { error: updateErr } = await supabase
      .from("vendor_widget_fees")
      .update({
        widget_state: newState,
        install_fee_paid: row.install_fee_paid || (action === "install" && fee > 0),
        pending_restoration_fee: chargeMode === "next_cycle",
        total_install_fees_charged: Number(row.total_install_fees_charged) + (fee > 0 ? fee : 0),
        updated_at: new Date().toISOString(),
      })
      .eq("vendor_id", user.id);

    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({
      success: true,
      fee,
      chargeMode,
      state: {
        widgetState: newState,
        installFeePaid: row.install_fee_paid || (action === "install" && fee > 0),
        pendingRestorationFee: chargeMode === "next_cycle",
        totalInstallFeesCharged: Number(row.total_install_fees_charged) + (fee > 0 ? fee : 0),
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
