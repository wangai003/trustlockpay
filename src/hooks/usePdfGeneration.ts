import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function usePdfGeneration() {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const generateAndDownload = useCallback(async (documentId: string) => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-pdf", {
        body: { action: "generate", documentId },
      });

      if (error) throw error;

      if (data?.fileUrl) {
        window.open(data.fileUrl, "_blank");
        toast({
          title: "PDF Generated",
          description: data.alreadyGenerated
            ? "Opening previously generated document."
            : "Your document has been generated and is downloading.",
        });
      }
      return data;
    } catch (err: any) {
      toast({
        title: "PDF Generation Failed",
        description: err.message || "Could not generate the document.",
        variant: "destructive",
      });
      return null;
    } finally {
      setGenerating(false);
    }
  }, [toast]);

  const generateBatch = useCallback(async (limit = 20) => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-pdf", {
        body: { action: "generate_batch", limit },
      });
      if (error) throw error;
      toast({
        title: "Batch Generation Complete",
        description: `Generated ${data?.generated || 0} PDFs. ${data?.failed || 0} failed.`,
      });
      return data;
    } catch (err: any) {
      toast({
        title: "Batch Generation Failed",
        description: err.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setGenerating(false);
    }
  }, [toast]);

  const getStatus = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("generate-pdf", {
      body: { action: "status" },
    });
    if (error) return null;
    return data;
  }, []);

  return { generateAndDownload, generateBatch, getStatus, generating };
}
