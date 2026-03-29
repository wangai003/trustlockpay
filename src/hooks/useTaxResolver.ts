import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TaxLineItem } from "@/components/shared/TaxBreakdown";

interface TaxResolveSummary {
  total_tax: number;
  is_domestic: boolean;
  is_cross_border: boolean;
  bloc: string | null;
  de_minimis_applied: boolean;
  de_minimis_threshold: number;
  buyer_country: string;
  vendor_country: string;
  item_category: string;
}

interface TaxResolveResult {
  items: (TaxLineItem & { amount: number; source: string; notes?: string })[];
  summary: TaxResolveSummary;
  notes: string;
}

export function useTaxResolver() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TaxResolveResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resolve = useCallback(async (
    buyerCountry: string,
    vendorCountry: string,
    amount: number,
    industry?: string,
    itemCategory?: string,
  ): Promise<TaxResolveResult | null> => {
    if (!buyerCountry && !vendorCountry) return null;
    if (amount <= 0) return null;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("tax-resolve", {
        body: {
          buyer_country: buyerCountry,
          vendor_country: vendorCountry,
          amount,
          industry,
          item_category: itemCategory,
        },
      });

      if (fnError) throw fnError;
      setResult(data);
      return data;
    } catch (err: any) {
      setError(err.message ?? "Tax resolution failed");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { resolve, loading, result, error };
}
