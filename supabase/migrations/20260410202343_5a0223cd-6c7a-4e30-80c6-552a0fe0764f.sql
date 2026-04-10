
-- FlashVet document analysis history table
CREATE TABLE public.flashvet_document_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lender_id UUID NOT NULL,
  document_name TEXT NOT NULL,
  document_type TEXT,
  confidence_score NUMERIC,
  dimension_scores JSONB DEFAULT '{}'::jsonb,
  findings_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.flashvet_document_analyses ENABLE ROW LEVEL SECURITY;

-- Lender sees only own analyses
CREATE POLICY "Lenders can view own analyses"
ON public.flashvet_document_analyses
FOR SELECT
TO authenticated
USING (lender_id = auth.uid());

-- Lenders can insert own analyses
CREATE POLICY "Lenders can insert own analyses"
ON public.flashvet_document_analyses
FOR INSERT
TO authenticated
WITH CHECK (lender_id = auth.uid());

-- Admins can view all analyses
CREATE POLICY "Admins can view all analyses"
ON public.flashvet_document_analyses
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Index for faster queries
CREATE INDEX idx_flashvet_analyses_lender ON public.flashvet_document_analyses (lender_id);
CREATE INDEX idx_flashvet_analyses_created ON public.flashvet_document_analyses (created_at DESC);
