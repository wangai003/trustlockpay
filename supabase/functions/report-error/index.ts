// Bug Sentry intake — single HTTP endpoint for reporting errors
// from anywhere (other edge functions, external services, frontend fallback).
// Writes via the `report_bug` SECURITY DEFINER function with service_role.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const ALLOWED_SEVERITY = new Set(["critical", "error", "warning", "info"]);
const ALLOWED_SOURCE = new Set(["frontend", "edge_function", "database_trigger", "cron", "blockchain", "manual"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const severity = String(body.severity || "error").toLowerCase();
  const source = String(body.source || "frontend").toLowerCase();
  const title = String(body.title || "").slice(0, 200).trim();
  const message = String(body.message || "").slice(0, 2000);
  const category = String(body.category || "unknown").slice(0, 100);

  if (!title || !message) return json({ error: "title and message required" }, 400);
  if (!ALLOWED_SEVERITY.has(severity)) return json({ error: "invalid severity" }, 400);
  if (!ALLOWED_SOURCE.has(source)) return json({ error: "invalid source" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await supabase.rpc("report_bug", {
    _severity: severity,
    _source: source,
    _category: category,
    _title: title,
    _message: message,
    _stack_trace: body.stack_trace ? String(body.stack_trace).slice(0, 4000) : null,
    _context: body.context ?? {},
    _route: body.route ? String(body.route).slice(0, 500) : null,
    _user_id: body.user_id ?? null,
    _user_role: body.user_role ? String(body.user_role).slice(0, 50) : null,
  });

  if (error) return json({ error: error.message }, 500);
  return json({ ok: true, bug_id: data });
});
