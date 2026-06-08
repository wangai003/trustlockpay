ALTER TABLE public.autonomous_fixer_tickets
DROP CONSTRAINT IF EXISTS autonomous_fixer_tickets_resolution_outcome_check;

ALTER TABLE public.autonomous_fixer_tickets
ADD CONSTRAINT autonomous_fixer_tickets_resolution_outcome_check
CHECK (resolution_outcome IN ('fixed','auto_fixed','no_action_needed','requires_executive','requires_code_change','blocked','pending') OR resolution_outcome IS NULL);