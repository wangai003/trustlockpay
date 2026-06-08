ALTER TABLE public.autonomous_fixer_tickets
  ADD COLUMN IF NOT EXISTS triage_results jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS scope text,
  ADD COLUMN IF NOT EXISTS affected_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_aft_triage_scope ON public.autonomous_fixer_tickets(scope);