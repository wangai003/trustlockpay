import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const results = { reminders_sent: 0, subscriptions_expired: 0, grace_periods_started: 0 };

    // 1. Check subscriptions approaching expiry (7 days, 3 days, 1 day)
    const { data: subs } = await supabase
      .from("vendor_subscriptions")
      .select("*")
      .eq("status", "active")
      .not("expires_at", "is", null);

    for (const sub of subs || []) {
      const expires = new Date(sub.expires_at);
      const daysLeft = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Send reminders at 7, 3, and 1 day marks
      if ([7, 3, 1].includes(daysLeft)) {
        await supabase.from("notifications").insert({
          user_id: sub.vendor_id,
          title: daysLeft === 1
            ? "⚠️ Plan Expires Tomorrow"
            : `📅 Plan Expires in ${daysLeft} Days`,
          message: daysLeft === 1
            ? `Your ${sub.plan_id} plan expires tomorrow. Renew now to avoid losing access to premium features.`
            : `Your ${sub.plan_id} plan expires in ${daysLeft} days. Renew via Plans & Pricing to avoid falling back to Basic.`,
          type: daysLeft <= 3 ? "warning" : "info",
          is_action_required: daysLeft <= 3,
          action_url: "/trustlock/vendor/pricing",
          related_entity_type: "subscription",
          related_entity_id: sub.id,
        });
        results.reminders_sent++;
      }

      // Expire subscription and start 7-day grace period
      if (daysLeft <= 0) {
        const graceEnd = new Date(now);
        graceEnd.setDate(graceEnd.getDate() + 7);

        await supabase
          .from("vendor_subscriptions")
          .update({
            status: "grace_period",
            grace_ends_at: graceEnd.toISOString(),
          })
          .eq("id", sub.id);

        await supabase.from("notifications").insert({
          user_id: sub.vendor_id,
          title: "🔴 Plan Expired — 7 Day Grace Period",
          message: `Your ${sub.plan_id} plan has expired. You have 7 days to renew before your account reverts to Basic. All your data is preserved.`,
          type: "warning",
          is_action_required: true,
          action_url: "/trustlock/vendor/pricing",
          related_entity_type: "subscription",
          related_entity_id: sub.id,
        });
        results.grace_periods_started++;
      }
    }

    // 2. Check grace periods that have ended → expire fully
    const { data: graceSubs } = await supabase
      .from("vendor_subscriptions")
      .select("*")
      .eq("status", "grace_period")
      .lt("grace_ends_at", now.toISOString());

    for (const sub of graceSubs || []) {
      await supabase
        .from("vendor_subscriptions")
        .update({ status: "expired" })
        .eq("id", sub.id);

      await supabase.from("notifications").insert({
        user_id: sub.vendor_id,
        title: "❌ Plan Fully Expired — Basic Mode Active",
        message: `Your grace period has ended. Your account is now on the Basic plan (max 15 orders/month). Upgrade anytime to restore full features.`,
        type: "warning",
        is_action_required: true,
        action_url: "/trustlock/vendor/pricing",
        related_entity_type: "subscription",
        related_entity_id: sub.id,
      });
      results.subscriptions_expired++;
    }

    // 3. Check unpaid widget bills (past due date)
    const { data: overdueBills } = await supabase
      .from("vendor_bills")
      .select("*")
      .eq("status", "pending")
      .lt("due_date", now.toISOString());

    for (const bill of overdueBills || []) {
      await supabase
        .from("vendor_bills")
        .update({ status: "overdue" })
        .eq("id", bill.id);

      // Send reminder if not sent in last 3 days
      const lastReminder = bill.reminder_sent_at ? new Date(bill.reminder_sent_at) : null;
      const daysSinceReminder = lastReminder
        ? Math.ceil((now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      if (daysSinceReminder >= 3 && bill.reminder_count < 5) {
        await supabase.from("notifications").insert({
          user_id: bill.vendor_id,
          title: "💳 Overdue Bill — Action Required",
          message: `You have an overdue ${bill.bill_type === "widget_install" ? "widget installation" : bill.bill_type} bill of $${Number(bill.amount).toFixed(2)}. ${bill.description || ""}`,
          type: "warning",
          is_action_required: true,
          action_url: "/trustlock/vendor/bill-payments",
          related_entity_type: "bill",
          related_entity_id: bill.id,
        });

        await supabase
          .from("vendor_bills")
          .update({
            reminder_sent_at: now.toISOString(),
            reminder_count: bill.reminder_count + 1,
          })
          .eq("id", bill.id);

        results.reminders_sent++;
      }
    }

    // 4. Check pending widget bills approaching due date (3 days, 1 day)
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const { data: upcomingBills } = await supabase
      .from("vendor_bills")
      .select("*")
      .eq("status", "pending")
      .gte("due_date", now.toISOString())
      .lte("due_date", threeDaysFromNow.toISOString());

    for (const bill of upcomingBills || []) {
      const dueDate = new Date(bill.due_date);
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Only send if not recently reminded
      const lastReminder = bill.reminder_sent_at ? new Date(bill.reminder_sent_at) : null;
      const daysSinceReminder = lastReminder
        ? Math.ceil((now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      if (daysSinceReminder >= 2) {
        await supabase.from("notifications").insert({
          user_id: bill.vendor_id,
          title: daysUntilDue <= 1
            ? "⏰ Bill Due Tomorrow"
            : `📅 Bill Due in ${daysUntilDue} Days`,
          message: `Your ${bill.bill_type === "widget_install" ? "widget installation" : bill.bill_type} bill of $${Number(bill.amount).toFixed(2)} is due ${daysUntilDue <= 1 ? "tomorrow" : `in ${daysUntilDue} days`}.`,
          type: "info",
          is_action_required: false,
          action_url: "/trustlock/vendor/bill-payments",
          related_entity_type: "bill",
          related_entity_id: bill.id,
        });

        await supabase
          .from("vendor_bills")
          .update({
            reminder_sent_at: now.toISOString(),
            reminder_count: bill.reminder_count + 1,
          })
          .eq("id", bill.id);

        results.reminders_sent++;
      }
    }

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
