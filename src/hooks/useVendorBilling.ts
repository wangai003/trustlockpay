import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// Types matching database
export interface VendorSubscription {
  id: string;
  vendor_id: string;
  plan_id: string;
  billing_cycle: string;
  status: string;
  starts_at: string;
  expires_at: string | null;
  grace_ends_at: string | null;
  amount_paid: number;
  payment_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorBill {
  id: string;
  vendor_id: string;
  bill_type: string;
  amount: number;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  site_id: string | null;
  description: string | null;
  reminder_sent_at: string | null;
  reminder_count: number;
  created_at: string;
}

export function useVendorSubscription() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["vendor-subscription", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("vendor_subscriptions")
        .select("*")
        .eq("vendor_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as VendorSubscription | null;
    },
    enabled: !!user,
  });
}

export function useVendorBills() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["vendor-bills", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("vendor_bills")
        .select("*")
        .eq("vendor_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as VendorBill[];
    },
    enabled: !!user,
  });
}

export function useCreateWidgetBill() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ siteId, amount, billType, description }: {
      siteId: string;
      amount: number;
      billType: "widget_install" | "widget_restore";
      description: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7); // 7-day payment window

      const { data, error } = await supabase
        .from("vendor_bills")
        .insert({
          vendor_id: user.id,
          bill_type: billType,
          amount,
          status: "pending",
          due_date: dueDate.toISOString(),
          site_id: siteId,
          description,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-bills"] });
    },
  });
}

export function usePayBill() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (billId: string) => {
      const { data: bill, error: fetchErr } = await supabase
        .from("vendor_bills")
        .select("*")
        .eq("id", billId)
        .single();
      if (fetchErr) throw fetchErr;

      const { error } = await supabase
        .from("vendor_bills")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", billId);
      if (error) throw error;

      // Auto-grant access based on bill type
      if (bill && user) {
        if (bill.bill_type === "widget_install" || bill.bill_type === "widget_restore") {
          // Mark widget fee as payment confirmed
          if (bill.site_id) {
            await supabase
              .from("vendor_widget_fees")
              .update({ payment_confirmed: true, widget_state: "installed" })
              .eq("vendor_id", user.id)
              .eq("site_id", bill.site_id);
            // Update localStorage cache
            const cached = JSON.parse(localStorage.getItem("tl_site_widget_fee_states") || "{}");
            if (cached[bill.site_id]) {
              cached[bill.site_id].installFeePaid = true;
              cached[bill.site_id].pendingRestorationFee = false;
              cached[bill.site_id].widgetState = "installed";
            } else {
              cached[bill.site_id] = { widgetState: "installed", installFeePaid: true, pendingRestorationFee: false, totalInstallFeesCharged: 5 };
            }
            localStorage.setItem("tl_site_widget_fee_states", JSON.stringify(cached));
          }
        } else if (bill.bill_type === "plan_subscription") {
          // Re-activate subscription
          await supabase
            .from("vendor_subscriptions")
            .update({ status: "active" })
            .eq("vendor_id", user.id)
            .eq("status", "grace_period");
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-bills"] });
      queryClient.invalidateQueries({ queryKey: ["vendor-subscription"] });
      queryClient.invalidateQueries({ queryKey: ["widget-payment-status"] });
      toast.success("Bill paid — access granted automatically!");
    },
  });
}

// Check if vendor is in trial mode (no widget fees)
export function isVendorInTrial(): boolean {
  const plan = localStorage.getItem("tl_vendor_plan");
  const trialStart = localStorage.getItem("tl_vendor_trial_start");
  if (plan !== "free" || !trialStart) return false;
  const start = new Date(trialStart);
  const elapsed = Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24));
  return elapsed < 30;
}

// Check if vendor has overdue bills (for standalone link enforcement)
export function useVendorEnforcementStatus() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["vendor-enforcement-status", user?.id],
    queryFn: async () => {
      if (!user) return { blocked: false, reason: "" };
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      // Check overdue bills older than 7 days
      const { count: overdueBills } = await supabase
        .from("vendor_bills")
        .select("id", { count: "exact", head: true })
        .eq("vendor_id", user.id)
        .eq("status", "overdue")
        .lt("due_date", sevenDaysAgo);
      
      // Check subscription status
      const { data: sub } = await supabase
        .from("vendor_subscriptions")
        .select("status")
        .eq("vendor_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (sub?.status === "expired") {
        return { blocked: true, reason: "Your plan has expired. Please renew to continue creating links." };
      }
      if ((overdueBills || 0) > 0) {
        return { blocked: true, reason: "You have overdue bills. Please settle them before creating new links." };
      }
      return { blocked: false, reason: "" };
    },
    enabled: !!user,
  });
}

export function useWidgetPaymentStatus(siteId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["widget-payment-status", user?.id, siteId],
    queryFn: async () => {
      if (!user || !siteId) return { confirmed: false };
      const { data } = await supabase
        .from("vendor_widget_fees")
        .select("payment_confirmed, widget_state")
        .eq("vendor_id", user.id)
        .eq("site_id", siteId)
        .maybeSingle();
      return {
        confirmed: data?.payment_confirmed ?? false,
        state: data?.widget_state ?? "never_installed",
      };
    },
    enabled: !!user && !!siteId,
  });
}

// Vendor plan lifecycle helpers
export function getSubscriptionStatus(sub: VendorSubscription | null): {
  isActive: boolean;
  isGracePeriod: boolean;
  isExpired: boolean;
  daysLeft: number | null;
  graceDaysLeft: number | null;
} {
  if (!sub) {
    return { isActive: false, isGracePeriod: false, isExpired: false, daysLeft: null, graceDaysLeft: null };
  }

  const now = new Date();

  if (sub.status === "expired" || sub.status === "cancelled") {
    return { isActive: false, isGracePeriod: false, isExpired: true, daysLeft: 0, graceDaysLeft: 0 };
  }

  if (sub.status === "grace_period" && sub.grace_ends_at) {
    const graceEnd = new Date(sub.grace_ends_at);
    const graceDaysLeft = Math.max(0, Math.ceil((graceEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    return { isActive: false, isGracePeriod: true, isExpired: false, daysLeft: 0, graceDaysLeft };
  }

  if (sub.status === "active" && sub.expires_at) {
    const expires = new Date(sub.expires_at);
    const daysLeft = Math.max(0, Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    return { isActive: true, isGracePeriod: false, isExpired: false, daysLeft, graceDaysLeft: null };
  }

  return { isActive: true, isGracePeriod: false, isExpired: false, daysLeft: null, graceDaysLeft: null };
}
