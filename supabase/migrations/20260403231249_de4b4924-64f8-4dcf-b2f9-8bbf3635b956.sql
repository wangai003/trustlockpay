
-- Create ai_signals table for cross-assistant coordination
CREATE TABLE public.ai_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_type TEXT NOT NULL,
  source_assistant TEXT NOT NULL,
  target_role TEXT NOT NULL DEFAULT 'all',
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  user_id UUID,
  severity TEXT NOT NULL DEFAULT 'info',
  summary TEXT NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_signals ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins manage all ai_signals"
  ON public.ai_signals FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can read signals targeting them or their transactions
CREATE POLICY "Users read own ai_signals"
  ON public.ai_signals FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = ai_signals.transaction_id
        AND (t.buyer_id = auth.uid() OR t.vendor_id = auth.uid())
    )
  );

-- Index for fast lookups
CREATE INDEX idx_ai_signals_transaction ON public.ai_signals(transaction_id) WHERE NOT is_resolved;
CREATE INDEX idx_ai_signals_user ON public.ai_signals(user_id) WHERE NOT is_resolved;
CREATE INDEX idx_ai_signals_target_role ON public.ai_signals(target_role) WHERE NOT is_resolved;
