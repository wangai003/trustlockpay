
-- Create document_scan_results table for automated document intelligence
CREATE TABLE public.document_scan_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_source TEXT NOT NULL,
  document_ref TEXT NOT NULL,
  document_type TEXT,
  country_detected TEXT,
  industry_detected TEXT,
  verdict TEXT NOT NULL DEFAULT 'pending',
  findings JSONB DEFAULT '[]'::jsonb,
  forgery_indicators JSONB DEFAULT '[]'::jsonb,
  verification_portal_url TEXT,
  confidence_score INTEGER,
  scanned_by TEXT NOT NULL DEFAULT 'system',
  user_id UUID,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  file_url TEXT,
  is_reviewed BOOLEAN NOT NULL DEFAULT false,
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.document_scan_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all scan results"
  ON public.document_scan_results FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users read own scan results"
  ON public.document_scan_results FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = document_scan_results.transaction_id
        AND (t.buyer_id = auth.uid() OR t.vendor_id = auth.uid())
    )
  );

CREATE INDEX idx_scan_results_user ON public.document_scan_results(user_id);
CREATE INDEX idx_scan_results_transaction ON public.document_scan_results(transaction_id);
CREATE INDEX idx_scan_results_verdict ON public.document_scan_results(verdict) WHERE NOT is_reviewed;
