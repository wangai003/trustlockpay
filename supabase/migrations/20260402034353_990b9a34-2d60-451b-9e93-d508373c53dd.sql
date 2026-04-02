-- Emmanuel conversation persistence
CREATE TABLE public.emmanuel_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id text NOT NULL DEFAULT 'system',
  case_ref text,
  title text,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.emmanuel_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage emmanuel conversations"
  ON public.emmanuel_conversations FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Emmanuel analytics tool usage tracking
CREATE TABLE public.emmanuel_tool_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.emmanuel_conversations(id) ON DELETE SET NULL,
  tool_name text NOT NULL,
  parameters jsonb DEFAULT '{}'::jsonb,
  result_summary text,
  execution_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.emmanuel_tool_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read tool usage"
  ON public.emmanuel_tool_usage FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service insert tool usage"
  ON public.emmanuel_tool_usage FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- SAR (Suspicious Activity Report) management
CREATE TABLE public.sar_filings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sar_number text NOT NULL UNIQUE,
  subject_name text NOT NULL,
  subject_id uuid,
  subject_role text,
  subject_country text,
  narrative text NOT NULL,
  evidence_refs jsonb DEFAULT '[]'::jsonb,
  related_transaction_ids jsonb DEFAULT '[]'::jsonb,
  related_flag_ids jsonb DEFAULT '[]'::jsonb,
  regulatory_authority text DEFAULT 'FinCEN',
  filing_status text NOT NULL DEFAULT 'draft',
  submitted_at timestamptz,
  acknowledged_at timestamptz,
  acknowledgement_ref text,
  drafted_by text DEFAULT 'emmanuel_ai',
  reviewed_by text,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sar_filings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage sar filings"
  ON public.sar_filings FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for quick lookups
CREATE INDEX idx_emmanuel_conversations_admin ON public.emmanuel_conversations(admin_user_id);
CREATE INDEX idx_emmanuel_conversations_case ON public.emmanuel_conversations(case_ref);
CREATE INDEX idx_sar_filings_status ON public.sar_filings(filing_status);
CREATE INDEX idx_sar_filings_subject ON public.sar_filings(subject_id);