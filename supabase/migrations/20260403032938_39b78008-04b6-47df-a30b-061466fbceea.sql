ALTER TABLE public.transaction_milestones
  ADD COLUMN IF NOT EXISTS estimated_days integer NOT NULL DEFAULT 7;

COMMENT ON COLUMN public.transaction_milestones.estimated_days IS 'Projected duration in days for this milestone stage';