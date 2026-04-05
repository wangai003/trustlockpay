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
    const results = {
      reminders_sent: 0,
      subscriptions_expired: 0,
      grace_periods_started: 0,
      widgets_disabled: 0,
      inbox_messages_sent: 0,
      renewal_bills_generated: 0,
    };

    // ─── Helper: send notification + inbox message to vendor ───
    async function notifyVendor(
      vendorId: string,
      title: string,
      message: string,
      type: string,
      opts?: { is_action_required?: boolean; action_url?: string; entity_type?: string; entity_id?: string }
    ) {
      // 1. Notification
      await supabase.from("notifications").insert({
        user_id: vendorId,
        title,
        message,
        type,
        is_action_required: opts?.is_action_required || false,
        action_url: opts?.action_url || null,
        related_entity_type: opts?.entity_type || null,
        related_entity_id: opts?.entity_id || null,
      });

      // 2. Automated inbox message via system thread
      const systemSenderId = "00000000-0000-0000-0000-000000000000";
      // Find or create a system billing thread for this vendor
      let threadId: string | null = null;
      const { data: existingThread } = await supabase
        .from("message_threads")
        .select("id")
        .eq("participant_1", systemSenderId)
        .eq("participant_2", vendorId)
        .eq("category", "billing")
        .limit(1)
        .maybeSingle();

      if (existingThread) {
        threadId = existingThread.id;
      } else {
        const { data: newThread } = await supabase
          .from("message_threads")
          .insert({
            participant_1: systemSenderId,
            participant_2: vendorId,
            category: "billing",
            subject: "Billing & Account Notifications",
            status: "open",
            case_status: "active",
          })
          .select("id")
          .single();
        threadId = newThread?.id || null;
      }

      if (threadId) {
        await supabase.from("messages").insert({
          thread_id: threadId,
          sender_id: systemSenderId,
          body: `**${title}**\n\n${message}`,
          is_read: false,
        });
        await supabase
          .from("message_threads")
          .update({ last_message_at: now.toISOString() })
          .eq("id", threadId);
        results.inbox_messages_sent++;
      }

      results.reminders_sent++;
    }

    // ═══════════════════════════════════════════════════════════
    // 1. Subscription Expiry Reminders (7, 3, 1 days)
    // ═══════════════════════════════════════════════════════════
    const { data: subs } = await supabase
      .from("vendor_subscriptions")
      .select("*")
      .eq("status", "active")
      .not("expires_at", "is", null);

    for (const sub of subs || []) {
      const expires = new Date(sub.expires_at);
      const daysLeft = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if ([7, 3, 1].includes(daysLeft)) {
        await notifyVendor(
          sub.vendor_id,
          daysLeft === 1 ? "⚠️ Plan Expires Tomorrow" : `📅 Plan Expires in ${daysLeft} Days`,
          daysLeft === 1
            ? `Your ${sub.plan_id} plan expires tomorrow. Renew now to avoid losing the ability to receive new orders. Go to Plans & Pricing to renew.`
            : `Your ${sub.plan_id} plan expires in ${daysLeft} days. Renew via Plans & Pricing to avoid falling back to Basic and losing the ability to accept new orders.`,
          daysLeft <= 3 ? "warning" : "info",
          {
            is_action_required: daysLeft <= 3,
            action_url: "/trustlock/vendor/pricing",
            entity_type: "subscription",
            entity_id: sub.id,
          }
        );
      }

      // Expire subscription → start 7-day grace period
      if (daysLeft <= 0) {
        const graceEnd = new Date(now);
        graceEnd.setDate(graceEnd.getDate() + 7);

        await supabase
          .from("vendor_subscriptions")
          .update({ status: "grace_period", grace_ends_at: graceEnd.toISOString() })
          .eq("id", sub.id);

        await notifyVendor(
          sub.vendor_id,
          "🔴 Plan Expired — 7 Day Grace Period",
          `Your ${sub.plan_id} plan has expired. You have 7 days to renew before your account reverts to Basic and new orders will be blocked. All your data is preserved. Go to Plans & Pricing to renew immediately.`,
          "warning",
          {
            is_action_required: true,
            action_url: "/trustlock/vendor/pricing",
            entity_type: "subscription",
            entity_id: sub.id,
          }
        );
        results.grace_periods_started++;
      }
    }

    // ═══════════════════════════════════════════════════════════
    // 2. Grace Periods Ended → Fully Expired (orders blocked)
    // ═══════════════════════════════════════════════════════════
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

      await notifyVendor(
        sub.vendor_id,
        "❌ Plan Fully Expired — New Orders Blocked",
        `Your grace period has ended. Your account is now on the Basic plan. New checkout orders through your widget will be blocked until you renew your plan. Your existing orders and payouts continue to process normally. Go to Plans & Pricing to upgrade and start receiving orders again.`,
        "warning",
        {
          is_action_required: true,
          action_url: "/trustlock/vendor/pricing",
          entity_type: "subscription",
          entity_id: sub.id,
        }
      );
      results.subscriptions_expired++;
    }

    // ═══════════════════════════════════════════════════════════
    // 3. Overdue Bills — Reminders + Enforcement Warnings
    // ═══════════════════════════════════════════════════════════
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
    }

    // Send reminders for all overdue bills
    const { data: allOverdue } = await supabase
      .from("vendor_bills")
      .select("*")
      .eq("status", "overdue");

    for (const bill of allOverdue || []) {
      const lastReminder = bill.reminder_sent_at ? new Date(bill.reminder_sent_at) : null;
      const daysSinceReminder = lastReminder
        ? Math.ceil((now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      if (daysSinceReminder >= 3 && bill.reminder_count < 5) {
        const dueDate = new Date(bill.due_date);
        const daysOverdue = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        let enforcementWarning = "";
        if (daysOverdue >= 5 && daysOverdue < 7) {
          enforcementWarning = "\n\n⚠️ If this bill remains unpaid for 7+ days, new order intake will be blocked.";
        } else if (daysOverdue >= 7 && bill.bill_type.includes("widget")) {
          enforcementWarning = "\n\n🚫 New orders through your checkout are currently blocked due to this overdue bill. Pay now to resume.";
        }
        if (bill.bill_type.includes("widget") && daysOverdue >= 12) {
          enforcementWarning += "\n\n⛔ Your widget will be auto-disabled in " + (14 - daysOverdue) + " day(s) if this bill remains unpaid.";
        }

        await notifyVendor(
          bill.vendor_id,
          "💳 Overdue Bill — Action Required",
          `You have an overdue ${bill.bill_type === "widget_install" ? "widget installation" : bill.bill_type} bill of $${Number(bill.amount).toFixed(2)}. ${bill.description || ""}${enforcementWarning}\n\nPay now via Bill Payments to avoid service disruption.`,
          "warning",
          {
            is_action_required: true,
            action_url: "/trustlock/vendor/bill-payments",
            entity_type: "bill",
            entity_id: bill.id,
          }
        );

        await supabase
          .from("vendor_bills")
          .update({ reminder_sent_at: now.toISOString(), reminder_count: bill.reminder_count + 1 })
          .eq("id", bill.id);
      }
    }

    // ═══════════════════════════════════════════════════════════
    // 4. Widget Auto-Disable: unpaid widget bills >14 days
    // ═══════════════════════════════════════════════════════════
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: widgetBillsToDisable } = await supabase
      .from("vendor_bills")
      .select("*")
      .eq("status", "overdue")
      .in("bill_type", ["widget_install", "widget_restore"])
      .lt("due_date", fourteenDaysAgo.toISOString());

    for (const bill of widgetBillsToDisable || []) {
      if (bill.site_id) {
        // Disable the widget
        await supabase
          .from("vendor_widget_fees")
          .update({ widget_state: "disabled" })
          .eq("vendor_id", bill.vendor_id)
          .eq("site_id", bill.site_id);

        await notifyVendor(
          bill.vendor_id,
          "⛔ Widget Disabled — Unpaid Bill",
          `Your checkout widget has been disabled because the $${Number(bill.amount).toFixed(2)} installation fee has been overdue for more than 14 days. Your widget will no longer appear on your site and cannot accept orders. Pay the outstanding bill in Bill Payments to re-enable your widget.`,
          "warning",
          {
            is_action_required: true,
            action_url: "/trustlock/vendor/bill-payments",
            entity_type: "bill",
            entity_id: bill.id,
          }
        );
        results.widgets_disabled++;
      }
    }

    // ═══════════════════════════════════════════════════════════
    // 5. Upcoming Bill Reminders (3 days, 1 day)
    // ═══════════════════════════════════════════════════════════
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

      const lastReminder = bill.reminder_sent_at ? new Date(bill.reminder_sent_at) : null;
      const daysSinceReminder = lastReminder
        ? Math.ceil((now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      if (daysSinceReminder >= 2) {
        await notifyVendor(
          bill.vendor_id,
          daysUntilDue <= 1 ? "⏰ Bill Due Tomorrow" : `📅 Bill Due in ${daysUntilDue} Days`,
          `Your ${bill.bill_type === "widget_install" ? "widget installation" : bill.bill_type} bill of $${Number(bill.amount).toFixed(2)} is due ${daysUntilDue <= 1 ? "tomorrow" : `in ${daysUntilDue} days`}. Pay early to avoid any service disruption.`,
          "info",
          { action_url: "/trustlock/vendor/bill-payments", entity_type: "bill", entity_id: bill.id }
        );

        await supabase
          .from("vendor_bills")
          .update({ reminder_sent_at: now.toISOString(), reminder_count: bill.reminder_count + 1 })
          .eq("id", bill.id);
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
