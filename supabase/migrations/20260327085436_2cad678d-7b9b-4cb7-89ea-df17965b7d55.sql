
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS milestone_status text DEFAULT 'not_applicable',
  ADD COLUMN IF NOT EXISTS milestone_proposed_by uuid;

COMMENT ON COLUMN public.transactions.milestone_status IS 'Milestone negotiation state: not_applicable, drafting, proposed, agreed';
COMMENT ON COLUMN public.transactions.milestone_proposed_by IS 'User ID of whoever proposed the current milestone draft';
