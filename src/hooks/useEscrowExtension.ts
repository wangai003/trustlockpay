import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MAX_EXTENSIONS = 3;

export const useEscrowExtensions = (transactionId?: string) => {
  return useQuery({
    queryKey: ["escrow-extensions", transactionId],
    enabled: !!transactionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("escrow_extensions")
        .select("*")
        .eq("transaction_id", transactionId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

export const useRequestExtension = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      transactionId,
      txId,
      reason,
      extraDays = 14,
    }: {
      transactionId: string;
      txId: string;
      reason: string;
      extraDays?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check existing extension count
      const { count } = await supabase
        .from("escrow_extensions")
        .select("*", { count: "exact", head: true })
        .eq("transaction_id", transactionId);

      if ((count ?? 0) >= MAX_EXTENSIONS) {
        throw new Error(`Maximum of ${MAX_EXTENSIONS} extensions allowed per order.`);
      }

      const { data, error } = await supabase
        .from("escrow_extensions")
        .insert({
          transaction_id: transactionId,
          tx_id: txId,
          requested_by: user.id,
          reason,
          extra_days: extraDays,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      toast.success("Extension request submitted! You'll be notified once reviewed.");
      queryClient.invalidateQueries({ queryKey: ["escrow-extensions", vars.transactionId] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
};

export const useReviewExtension = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      extensionId,
      decision,
    }: {
      extensionId: string;
      transactionId: string;
      decision: "approved" | "rejected";
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("escrow_extensions")
        .update({
          status: decision,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", extensionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      toast.success(
        vars.decision === "approved"
          ? "Extension approved. Timer has been extended."
          : "Extension request declined."
      );
      queryClient.invalidateQueries({ queryKey: ["escrow-extensions", vars.transactionId] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
};

export { MAX_EXTENSIONS };
