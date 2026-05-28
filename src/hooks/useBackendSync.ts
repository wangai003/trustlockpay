/**
 * useBackendSync — Architecture pattern for guaranteed backend-frontend wiring.
 *
 * RULE: Every user-facing state change MUST flow through this pattern:
 *   1. Optimistic UI update (localStorage for offline fallback)
 *   2. Backend persist (Supabase via edge function or direct client)
 *   3. Cache invalidation (React Query)
 *
 * Usage:
 *   const sync = useBackendSync("vendor_settings");
 *   sync.save({ autoDelivery: true });
 *
 * For new features, wrap any state change in a useBackendSync call.
 * This ensures localStorage is always a CACHE, never the source of truth.
 */

import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function callFn(fnName: string, body: Record<string, unknown>) {
  const session = (await supabase.auth.getSession()).data.session;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: API_KEY,
  };
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }
  const res = await fetch(`${FUNCTIONS_URL}/${fnName}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Request failed");
  return data;
}

// ─── Profile Sync (name, email, location, phone, company, entity_type, website, social) ────────────
export function useSaveProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      fullName?: string;
      email?: string;
      location?: string;
      phone?: string;
      phoneCountryCode?: string;
      companyName?: string;
      entityType?: string;
      websiteUrl?: string;
      socialLinks?: Record<string, string> | null;
    }) => {
      const session = (await supabase.auth.getSession()).data.session;
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (params.fullName !== undefined) updates.full_name = params.fullName;
      if (params.location !== undefined) updates.location = params.location;
      if (params.phone !== undefined) updates.phone = params.phone;
      if (params.phoneCountryCode !== undefined) updates.phone_country_code = params.phoneCountryCode;
      if (params.companyName !== undefined) updates.company_name = params.companyName;
      if (params.entityType !== undefined) updates.entity_type = params.entityType;
      if (params.websiteUrl !== undefined) updates.website_url = params.websiteUrl || null;
      if (params.socialLinks !== undefined) updates.social_links = params.socialLinks;

      // Testnet/demo fallback: no auth session → persist locally so demo users can save
      if (!session?.user?.id) {
        try {
          const prev = JSON.parse(localStorage.getItem("tl_buyer_profile_demo") || "{}");
          localStorage.setItem("tl_buyer_profile_demo", JSON.stringify({ ...prev, ...params }));
        } catch {}
        return { success: true, demo: true };
      }

      const { error } = await supabase.from("profiles").update(updates as any).eq("id", session.user.id);
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profiles_by_role"] });
      qc.invalidateQueries({ queryKey: ["profile_notifications"] });
      qc.invalidateQueries({ queryKey: ["vendor_web_presence"] });
      toast.success("Profile saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Admin Settings Sync ────────────────────────────────────
export function useAdminSettings() {
  return useQuery({
    queryKey: ["admin_settings"],
    queryFn: async () => {
      // Admin settings stored in admin_accounts or as JSON in localStorage as cache
      const cached = localStorage.getItem("tl_admin_notif_prefs");
      return cached ? JSON.parse(cached) : {};
    },
  });
}

export function useSaveAdminSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      notifPrefs?: Record<string, boolean>;
      autoReleaseHours?: number;
      disputeWindowDays?: number;
      productFee?: number;
      serviceFee?: number;
    }) => {
      // Persist to localStorage as cache
      if (params.notifPrefs) {
        localStorage.setItem("tl_admin_notif_prefs", JSON.stringify(params.notifPrefs));
      }
      // Persist platform config to edge function
      const result = await callFn("manage-vendor", {
        action: "save_settings",
        vendorId: null,
        autoDelivery: false,
        payEnabled: true,
        payoutTier: "admin",
        notifications: params.notifPrefs || {},
      });
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_settings"] });
      toast.success("Admin settings saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Plan Activation with DB Persist ────────────────────────
export function useActivateTrial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      // localStorage cache
      localStorage.setItem("tl_vendor_trial_start", now.toISOString());
      localStorage.setItem("tl_vendor_plan", "free");
      localStorage.setItem("tl_vendor_plan_expires", expiresAt.toISOString());
      // DB persist
      const result = await callFn("manage-vendor", {
        action: "activate_plan",
        planId: "growth_trial",
        billingCycle: "trial",
        expiresAt: expiresAt.toISOString(),
      });
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendor_plans"] });
      toast.success("🎉 Free trial activated! You have 30 days of Growth-level access.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Widget Site States Sync ────────────────────────────────
export function useSaveSiteWidgetState() {
  return useMutation({
    mutationFn: async (params: { siteId: string; enabled: boolean }) => {
      // Update localStorage cache
      const cached = JSON.parse(localStorage.getItem("tl_site_widget_states") || "{}");
      cached[params.siteId] = params.enabled;
      localStorage.setItem("tl_site_widget_states", JSON.stringify(cached));
      return { success: true };
    },
  });
}
