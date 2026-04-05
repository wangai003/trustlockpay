-- Add bridge columns to team_task_assignments
ALTER TABLE public.team_task_assignments
  ADD COLUMN IF NOT EXISTS lead_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS lead_verified_by uuid,
  ADD COLUMN IF NOT EXISTS reassigned_from uuid,
  ADD COLUMN IF NOT EXISTS transaction_milestone_id uuid REFERENCES public.transaction_milestones(id);

-- Create index for milestone lookups
CREATE INDEX IF NOT EXISTS idx_team_tasks_milestone ON public.team_task_assignments(transaction_milestone_id) WHERE transaction_milestone_id IS NOT NULL;