import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ADMIN_SENTINEL_ID = "00000000-0000-0000-0000-000000000001";

// ─── Admin Aliases ──────────────────────────────────────────
export function useAdminAliases() {
  return useQuery({
    queryKey: ["admin-aliases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_aliases")
        .select("*");
      if (error) throw error;
      return data;
    },
  });
}

// ─── Chief Admin Config ─────────────────────────────────────
export function useChiefAdminConfig() {
  return useQuery({
    queryKey: ["chief-admin-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chief_admin_config")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// ─── Admin Action Log ───────────────────────────────────────
export function useAdminActionLog(limit = 50) {
  return useQuery({
    queryKey: ["admin-action-log", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_action_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });
}

export function useLogAdminAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      adminId: string;
      actionType: string;
      caseId?: string;
      caseType?: string;
      justification?: string;
      isDeviation?: boolean;
      deviationDetails?: string;
      requiresChiefReview?: boolean;
      metadata?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase
        .from("admin_action_log")
        .insert([{
          admin_id: params.adminId,
          action_type: params.actionType,
          case_id: params.caseId,
          case_type: params.caseType,
          justification: params.justification,
          is_deviation: params.isDeviation || false,
          deviation_details: params.deviationDetails,
          requires_chief_review: params.requiresChiefReview || false,
          metadata: params.metadata || {},
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-action-log"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useChiefReviewAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      logId: string;
      decision: string;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from("admin_action_log")
        .update({
          chief_reviewed_at: new Date().toISOString(),
          chief_decision: params.decision,
          chief_notes: params.notes,
        })
        .eq("id", params.logId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-action-log"] });
      toast.success("Chief review submitted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Thread Claim ───────────────────────────────────────────
export function useClaimThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { threadId: string; adminId: string }) => {
      const { error } = await supabase
        .from("message_threads")
        .update({
          claimed_by: params.adminId,
          claimed_at: new Date().toISOString(),
        })
        .eq("id", params.threadId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-threads"] });
      toast.success("Thread claimed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUnclaimThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (threadId: string) => {
      const { error } = await supabase
        .from("message_threads")
        .update({
          claimed_by: null,
          claimed_at: null,
        })
        .eq("id", threadId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-threads"] });
      toast.success("Thread released");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateCaseStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { threadId: string; caseStatus: string }) => {
      const { error } = await supabase
        .from("message_threads")
        .update({ case_status: params.caseStatus })
        .eq("id", params.threadId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-threads"] });
      toast.success("Case status updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Dispute Override (Chief Admin) ─────────────────────────
export function useChiefOverrideDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      disputeId: string;
      chiefAdminId: string;
      overrideReason: string;
      overrideWindowHours: number;
    }) => {
      const deadline = new Date();
      deadline.setHours(deadline.getHours() + params.overrideWindowHours);

      const { data: dispute } = await supabase
        .from("disputes")
        .select("resolution, status")
        .eq("id", params.disputeId)
        .single();

      const { error } = await supabase
        .from("disputes")
        .update({
          original_resolution: dispute?.resolution || dispute?.status,
          override_reason: params.overrideReason,
          overridden_by: params.chiefAdminId,
          overridden_at: new Date().toISOString(),
          override_deadline: deadline.toISOString(),
          status: "under_review",
          resolution: null,
        })
        .eq("id", params.disputeId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["disputes"] });
      toast.success("Dispute override activated — countdown started");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
