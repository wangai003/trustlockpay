// Centralized Supabase data hooks for all dashboard pages
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function callEdgeFunction(functionName: string, body: Record<string, unknown>) {
  const session = (await supabase.auth.getSession()).data.session;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: API_KEY,
  };
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }
  const res = await fetch(`${FUNCTIONS_URL}/${functionName}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Request failed");
  return data;
}

// ─── Transactions ───────────────────────────────────────────
export function useTransactions(filters?: { status?: string; vendor?: string; buyer?: string }) {
  return useQuery({
    queryKey: ["transactions", filters],
    queryFn: async () => {
      let query = supabase.from("transactions").select("*").order("created_at", { ascending: false });
      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      if (filters?.vendor) {
        query = query.eq("vendor_name", filters.vendor);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useTransaction(txId: string) {
  return useQuery({
    queryKey: ["transaction", txId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("tx_id", txId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!txId,
  });
}

export function useAddTracking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { txId: string; tracking: string; transportLegs?: any[]; updateOnly?: boolean }) => {
      const action = params.updateOnly ? "update_tracking" : "add_tracking";
      return callEdgeFunction("manage-transaction", { action, txId: params.txId, tracking: params.tracking, transportLegs: params.transportLegs });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Tracking updated successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useConfirmDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (txId: string) =>
      callEdgeFunction("manage-transaction", { action: "confirm_delivery", txId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Delivery confirmed — you may now release funds to vendor");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useReleaseFunds() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (txId: string) =>
      callEdgeFunction("manage-transaction", { action: "release_funds", txId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Funds released to vendor successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useMarkDelivered() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (txId: string) =>
      callEdgeFunction("manage-transaction", { action: "mark_delivered", txId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Order marked as delivered");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRejectOrders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (txIds: string[]) =>
      callEdgeFunction("manage-transaction", { action: "reject_orders", txIds }),
    onSuccess: (_data, txIds) => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success(`${txIds.length} order(s) rejected. Buyers have been notified.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useFlagForReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (txIds: string[]) =>
      callEdgeFunction("manage-transaction", { action: "flag_review", txIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Flagged for review");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useOpenDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { txId: string; reason?: string; description?: string }) =>
      callEdgeFunction("manage-transaction", { action: "open_dispute", ...params }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["disputes"] });
      toast.success("Dispute filed successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Milestones / Observers ────────────────────────────────
export function useTransactionMilestones(transactionId?: string) {
  return useQuery({
    queryKey: ["transaction_milestones", transactionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transaction_milestones")
        .select("*")
        .eq("transaction_id", transactionId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!transactionId,
  });
}

export function useTransactionObservers(transactionId?: string) {
  return useQuery({
    queryKey: ["transaction_observers", transactionId],
    queryFn: async () => {
      // RPC excludes access_token and enforces party/admin scope server-side
      const { data, error } = await supabase.rpc("get_transaction_observers" as any, {
        _transaction_id: transactionId!,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!transactionId,
  });
}

export function useCreateMilestones() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      transactionId: string;
      userId?: string | null;
      industryKey?: string;
      customMilestones?: Record<string, unknown>[];
    }) =>
      callEdgeFunction("escrow-manager", {
        action: "create_milestones",
        transaction_id: params.transactionId,
        user_id: params.userId,
        industry_key: params.industryKey,
        custom_milestones: params.customMilestones,
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["transaction_milestones", variables.transactionId] });
      toast.success("Milestones initialized");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      milestoneId: string;
      userId?: string | null;
      status?: string;
      description?: string;
      uploadedDocuments?: unknown[];
    }) =>
      callEdgeFunction("escrow-manager", {
        action: "update_milestone",
        milestone_id: params.milestoneId,
        user_id: params.userId,
        status: params.status,
        description: params.description,
        uploaded_documents: params.uploadedDocuments,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transaction_milestones"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Milestone updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useReleaseMilestonePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { milestoneId: string; userId?: string | null }) =>
      callEdgeFunction("escrow-manager", {
        action: "release_milestone_payment",
        milestone_id: params.milestoneId,
        user_id: params.userId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transaction_milestones"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["payouts"] });
      toast.success("Milestone payment released");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAddTransactionObserver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      transactionId: string;
      observerName: string;
      observerEmail: string;
      observerRole?: string;
      milestoneIds?: string[];
      permissions?: string[];
      userId?: string | null;
    }) =>
      callEdgeFunction("escrow-manager", {
        action: "add_observer",
        transaction_id: params.transactionId,
        observer_name: params.observerName,
        observer_email: params.observerEmail,
        observer_role: params.observerRole,
        milestone_ids: params.milestoneIds ?? [],
        permissions: params.permissions ?? ["view", "sign", "upload", "comment"],
        user_id: params.userId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transaction_observers"] });
      qc.invalidateQueries({ queryKey: ["transaction_milestones"] });
      toast.success("Observer invited");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Disputes ───────────────────────────────────────────────
export function useDisputes(filters?: { role?: string }) {
  return useQuery({
    queryKey: ["disputes", filters],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("disputes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useFileDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { txId: string; reason: string; description?: string }) =>
      callEdgeFunction("manage-dispute", { action: "file_dispute", ...params }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["disputes"] });
      toast.success("Dispute filed — Emmanuel AI will review your case");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useReviewDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (disputeId: string) =>
      callEdgeFunction("manage-dispute", { action: "review_dispute", disputeId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["disputes"] });
      toast.success("Dispute sent for AI review");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useResolveDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { disputeId: string; resolution?: string }) =>
      callEdgeFunction("manage-dispute", { action: "resolve_dispute", ...params }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["disputes"] });
      toast.success("Dispute resolved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useEscalateToArbitration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (disputeId: string) =>
      callEdgeFunction("manage-dispute", { action: "escalate_to_arbitration", disputeId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["disputes"] });
      toast.success("Dispute escalated to arbitration");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAssignArbitrator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { disputeId: string; arbitratorName: string; arbitratorEmail: string }) =>
      callEdgeFunction("manage-dispute", { action: "assign_arbitrator", ...params }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["disputes"] });
      toast.success("Arbitrator assigned successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSubmitRuling() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { disputeId: string; ruling: string; splitPercentage?: number }) =>
      callEdgeFunction("manage-dispute", { action: "submit_ruling", ...params }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["disputes"] });
      toast.success("Arbitration ruling submitted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAcceptRuling() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { disputeId: string; party: "buyer" | "vendor" }) =>
      callEdgeFunction("manage-dispute", { action: "accept_ruling", ...params }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["disputes"] });
      toast.success("Ruling accepted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useResolveDisputeVendorWins() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (disputeId: string) =>
      callEdgeFunction("manage-dispute", { action: "resolve_vendor_wins", disputeId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["disputes"] });
      toast.success("Dispute resolved — vendor wins, funds released");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useResolveDisputeBuyerWins() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (disputeId: string) =>
      callEdgeFunction("manage-dispute", { action: "resolve_buyer_wins", disputeId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["disputes"] });
      toast.success("Dispute resolved — buyer wins, refund initiated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useResolveDisputeCompromise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { disputeId: string; splitPercentage: number }) =>
      callEdgeFunction("manage-dispute", { action: "resolve_compromise", ...params }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["disputes"] });
      toast.success("Dispute resolved — compromise split executed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Payouts ────────────────────────────────────────────────
export function usePayouts() {
  return useQuery({
    queryKey: ["payouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payouts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ─── Vendor Sites ───────────────────────────────────────────
export function useVendorSites() {
  return useQuery({
    queryKey: ["vendor_sites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_sites")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAddSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { name: string; platform: string; url: string; industry?: string }) =>
      callEdgeFunction("manage-vendor", { action: "add_site", ...params }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendor_sites"] });
      toast.success("Site connected successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (siteId: string) =>
      callEdgeFunction("manage-vendor", { action: "delete_site", siteId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendor_sites"] });
      toast.success("Site removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── KYC Documents ──────────────────────────────────────────
export function useKycDocuments() {
  return useQuery({
    queryKey: ["kyc_documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kyc_documents")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useUploadKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { documentName: string; fileUrl?: string }) =>
      callEdgeFunction("manage-vendor", { action: "upload_kyc", ...params }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kyc_documents"] });
      toast.success("Document uploaded for review");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── KYC Queue (Admin) ─────────────────────────────────────
export function useKycQueue() {
  return useQuery({
    queryKey: ["kyc_queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kyc_queue")
        .select("*")
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ─── Compliance Flags ───────────────────────────────────────
export function useComplianceFlags() {
  return useQuery({
    queryKey: ["compliance_flags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compliance_flags")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ─── OS Payments ────────────────────────────────────────────
export function useProcessPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      action?: string;
      service: string;
      amount: string;
      fee: string;
      total: string;
      method: string;
      role: string;
      payMode?: string;
      refundEmail?: string;
      refundReason?: string;
      splitRecipient?: string;
      splitPercentage?: string;
      // Processor routing params (triggers real API flow)
      processor?: "stripe" | "coinbase" | "transak" | "thirdweb" | "direct";
      direction?: "onramp" | "offramp";
      currency?: string;
      walletAddress?: string;
      // Payment detail payloads
      buyer_country?: string;
      bankTransferDetails?: {
        bankName: string;
        region?: string;
        country?: string;
        accountNumber?: string;
        branchCode?: string;
        bvn?: string;
        iban?: string;
        rib?: string;
        sortCode?: string;
        type: "international" | "local_africa";
      };
      mobileMoneyDetails?: {
        provider: string;
        phoneNumber: string;
        country: string;
      };
    }) => callEdgeFunction("process-payment", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["os_payments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Vendor Settings ────────────────────────────────────────
// Explicit column list excludes shipping_api_key_encrypted (revoked at DB layer)
const VENDOR_SETTINGS_COLS =
  "id, vendor_id, auto_delivery, pay_enabled, payout_tier, notifications, updated_at, widget_theme, widget_mode, supported_currencies, industry_category, transaction_types, shipping_api_provider, auto_milestone_template, marketplace_integrations";

export function useVendorSettings() {
  return useQuery({
    queryKey: ["vendor_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_settings")
        .select(VENDOR_SETTINGS_COLS as any)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveVendorSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { autoDelivery?: boolean; payEnabled?: boolean; payoutTier?: string; notifications?: Record<string, boolean> }) =>
      callEdgeFunction("manage-vendor", { action: "save_settings", ...params }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendor_settings"] });
      toast.success("Settings saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Vendor Plans ───────────────────────────────────────────
export function useActivatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { planId: string; billingCycle: string; expiresAt: string }) => {
      // 1. Legacy vendor_plans table
      await callEdgeFunction("manage-vendor", { action: "activate_plan", ...params });
      // 2. Upsert vendor_subscriptions for billing lifecycle
      const session = (await supabase.auth.getSession()).data.session;
      if (session?.user?.id) {
        const { data: existing } = await supabase
          .from("vendor_subscriptions")
          .select("id")
          .eq("vendor_id", session.user.id)
          .eq("status", "active")
          .maybeSingle();

        if (existing) {
          // Update existing active subscription
          await supabase
            .from("vendor_subscriptions")
            .update({
              plan_id: params.planId,
              billing_cycle: params.billingCycle,
              expires_at: params.expiresAt,
              status: "active",
              amount_paid: params.billingCycle === "monthly"
                ? (await import("@/hooks/useVendorPlan")).PLANS[params.planId as import("@/hooks/useVendorPlan").PlanId]?.monthly || 0
                : (await import("@/hooks/useVendorPlan")).PLANS[params.planId as import("@/hooks/useVendorPlan").PlanId]?.yearly || 0,
            })
            .eq("id", existing.id);
        } else {
          // Insert new subscription
          const plans = (await import("@/hooks/useVendorPlan")).PLANS;
          const plan = plans[params.planId as import("@/hooks/useVendorPlan").PlanId];
          await supabase.from("vendor_subscriptions").insert({
            vendor_id: session.user.id,
            plan_id: params.planId,
            billing_cycle: params.billingCycle,
            status: "active",
            expires_at: params.expiresAt,
            amount_paid: params.billingCycle === "monthly" ? (plan?.monthly || 0) : (plan?.yearly || 0),
          });
        }

        // Mark any pending plan_subscription bills as paid
        await supabase
          .from("vendor_bills")
          .update({ status: "paid", paid_at: new Date().toISOString() })
          .eq("vendor_id", session.user.id)
          .eq("bill_type", "plan_subscription")
          .eq("status", "pending");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendor_plans"] });
      qc.invalidateQueries({ queryKey: ["vendor-subscription"] });
      qc.invalidateQueries({ queryKey: ["vendor-bills"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Archived Reports ───────────────────────────────────────
export function useArchivedReports(role: string) {
  return useQuery({
    queryKey: ["archived_reports", role],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("archived_reports")
        .select("*")
        .eq("owner_role", role)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ─── Seed Tokens (Dual-Token Architecture) ─────────────────
// OS Pay  → purpose: "os_pay"   → hardwired to Transaction Fee Wallet (revenue collection)
// OS Payout → purpose: "os_payout" → hardwired to Escrow Wallet (escrow disbursement)
export function useGetOrCreateSeedToken(purpose: "os_pay" | "os_payout" = "os_pay") {
  return useMutation({
    mutationFn: async () => {
      const session = (await supabase.auth.getSession()).data.session;
      const userId = session?.user?.id || "00000000-0000-0000-0000-000000000000";
      return callEdgeFunction("manage-seed-token", { action: "get_or_create_token", userId, purpose });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSeedToken() {
  return useQuery({
    queryKey: ["seed_token"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seed_tokens")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// ─── Payout Requests ────────────────────────────────────────
export function useInitiatePayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      seedToken: string;
      role: string;
      payoutType: string;
      transactionId?: string;
      orderNumber?: string;
      amount: string;
      paymentCategory: string;
      paymentProvider: string;
      providerDetails: Record<string, unknown>;
      mode: string;
    }) => callEdgeFunction("manage-seed-token", { action: "initiate_payout", ...params }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payout_requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCancelPayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { payoutId: string; reason?: string }) =>
      callEdgeFunction("manage-seed-token", { action: "cancel_payout", ...params }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payout_requests"] });
      toast.success("Payout cancelled");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function usePayoutRequests() {
  return useQuery({
    queryKey: ["payout_requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payout_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ─── Order Carbon Copies ────────────────────────────────────
export function useOrderCarbonCopies() {
  return useQuery({
    queryKey: ["order_carbon_copies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_carbon_copies")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCarbonCopy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Record<string, unknown>) =>
      callEdgeFunction("manage-seed-token", { action: "create_carbon_copy", ...params }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order_carbon_copies"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useActivateCarbonCopy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (carbonCopyId: string) =>
      callEdgeFunction("manage-seed-token", { action: "activate_carbon_copy", carbonCopyId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order_carbon_copies"] });
      toast.success("Carbon copy activated — buyer notified");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Dispute Evidence ───────────────────────────────────────
export function useDisputeEvidence(disputeId?: string) {
  return useQuery({
    queryKey: ["dispute_evidence", disputeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispute_evidence")
        .select("*")
        .eq("dispute_id", disputeId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!disputeId,
  });
}

export function useUploadDisputeEvidence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { disputeId: string; file: File }) => {
      const path = `${params.disputeId}/${Date.now()}_${params.file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("dispute-evidence")
        .upload(path, params.file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("dispute-evidence")
        .getPublicUrl(path);

      const session = (await supabase.auth.getSession()).data.session;
      const { error: insertErr } = await supabase
        .from("dispute_evidence")
        .insert({
          dispute_id: params.disputeId,
          file_url: urlData.publicUrl || path,
          file_name: params.file.name,
          file_type: params.file.type,
          uploaded_by: session?.user?.id || null,
        });
      if (insertErr) throw insertErr;
      return { success: true };
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["dispute_evidence", variables.disputeId] });
      toast.success("Evidence uploaded successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Profile Notification Preferences ───────────────────────
export function useProfileNotifications() {
  return useQuery({
    queryKey: ["profile_notifications"],
    queryFn: async () => {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session?.user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("notification_channels")
        .eq("id", session.user.id)
        .maybeSingle();
      if (error) throw error;
      return data?.notification_channels as Record<string, boolean> | null;
    },
  });
}

export function useSaveProfileNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (prefs: Record<string, boolean>) => {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session?.user?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("profiles")
        .update({ notification_channels: prefs as any })
        .eq("id", session.user.id);
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile_notifications"] });
      toast.success("Notification preferences saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Admin: All Profiles by Role ────────────────────────────
export function useProfilesByRole(role: "vendor" | "buyer") {
  return useQuery({
    queryKey: ["profiles_by_role", role],
    queryFn: async () => {
      // Get user_ids with this role
      const { data: roleRows, error: roleErr } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", role);
      if (roleErr) throw roleErr;
      if (!roleRows?.length) return [];

      const userIds = roleRows.map((r) => r.user_id);
      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds)
        .order("created_at", { ascending: false });
      if (profErr) throw profErr;
      return profiles || [];
    },
  });
}

// ─── Admin: Sanctions Screening Logs ────────────────────────
export function useSanctionsScreeningLogs() {
  return useQuery({
    queryKey: ["sanctions_screening_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sanctions_screening_logs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ─── Admin: Save Onboarding Profile Data ────────────────────
export function useSaveOnboardingProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { industry: string; location: string; fullName?: string }) => {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session?.user?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("profiles")
        .update({
          onboarding_industry: params.industry,
          location: params.location,
          full_name: params.fullName || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.user.id);
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profiles_by_role"] });
      toast.success("Profile updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Vendor Rejections (Analytics) ──────────────────────────
export function useVendorRejections() {
  return useQuery({
    queryKey: ["vendor_rejections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_rejections" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}
