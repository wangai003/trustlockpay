
ALTER TABLE public.transaction_milestones
  ADD COLUMN IF NOT EXISTS document_mode text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS optional_documents jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.transaction_milestones.document_mode IS 'none = no docs needed, optional = warn but allow, required = hard block fulfillment';
COMMENT ON COLUMN public.transaction_milestones.optional_documents IS 'List of recommended but non-mandatory document names for this milestone';
