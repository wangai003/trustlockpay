// Bug Sentry — outbound webhook delivery (Slack + email).
// Called by the DB trigger via pg_net on critical/error bugs, OR manually.
// Gracefully no-ops if no SLACK_WEBHOOK_URL or ALERT_EMAIL_TO is configured.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SEVERITY_EMOJI: Record<string, string> = {
  critical: "🚨",
  error: "🔴",
  warning: "🟡",
  info: "🔵",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { bug_id, digest } = await req.json().catch(() => ({}));
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let bugs: any[] = [];
    if (bug_id) {
      const { data } = await supa.from("bug_reports").select("*").eq("id", bug_id).limit(1);
      bugs = data || [];
    } else if (digest) {
      // Digest mode: send unacknowledged critical/error bugs from last hour
      const { data } = await supa
        .from("bug_reports")
        .select("*")
        .is("resolved_at", null)
        .is("acknowledged_at", null)
        .in("severity", ["critical", "error"])
        .gte("created_at", new Date(Date.now() - 3600_000).toISOString())
        .order("created_at", { ascending: false })
        .limit(20);
      bugs = data || [];
    }

    if (bugs.length === 0) {
      return json({ ok: true, sent: 0, reason: "no_bugs" });
    }

    const slackUrl = Deno.env.get("SLACK_WEBHOOK_URL");
    const alertEmail = Deno.env.get("ALERT_EMAIL_TO");
    const results: Record<string, any> = {};

    // Slack delivery
    if (slackUrl) {
      const blocks = bugs.flatMap((b) => [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `${SEVERITY_EMOJI[b.severity] || "•"} *${b.severity.toUpperCase()}* — ${b.title}\n` +
              `\`${b.source}\` / \`${b.category}\`${b.occurrence_count > 1 ? ` × ${b.occurrence_count}` : ""}\n` +
              `${b.message.slice(0, 300)}${b.message.length > 300 ? "…" : ""}`,
          },
        },
        { type: "context", elements: [{ type: "mrkdwn", text: `Route: \`${b.route ?? "n/a"}\` · ${new Date(b.last_seen_at).toISOString()}` }] },
        { type: "divider" },
      ]);
      const slackRes = await fetch(slackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `🚨 Bug Sentry: ${bugs.length} alert(s)`,
          blocks,
        }),
      });
      results.slack = { status: slackRes.status, ok: slackRes.ok };
    }

    // Email delivery via Lovable AI Gateway emails (or Resend if configured)
    if (alertEmail) {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        const html = bugs.map((b) =>
          `<div style="border-left:4px solid #c00;padding:8px 12px;margin:8px 0;background:#fafafa">
            <strong>${SEVERITY_EMOJI[b.severity] || ""} ${b.severity.toUpperCase()} — ${escapeHtml(b.title)}</strong><br/>
            <small>${b.source} / ${b.category}${b.occurrence_count > 1 ? ` × ${b.occurrence_count}` : ""} · ${b.route ?? ""}</small>
            <p style="margin:6px 0">${escapeHtml(b.message)}</p>
          </div>`
        ).join("");
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
          body: JSON.stringify({
            from: Deno.env.get("ALERT_EMAIL_FROM") || "alerts@trustlockpay.com",
            to: [alertEmail],
            subject: `🚨 Bug Sentry: ${bugs.length} alert(s)`,
            html: `<h2>Bug Sentry alert</h2>${html}`,
          }),
        });
        results.email = { status: emailRes.status, ok: emailRes.ok };
      } else {
        results.email = { skipped: "no_resend_key" };
      }
    }

    // Mark webhook sent
    await supa
      .from("bug_reports")
      .update({ last_webhook_sent_at: new Date().toISOString() })
      .in("id", bugs.map((b) => b.id));

    return json({ ok: true, sent: bugs.length, results });
  } catch (e: any) {
    return json({ ok: false, error: e?.message || String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
