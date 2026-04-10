
-- Fix the safe view to use SECURITY INVOKER (default in newer PG, but explicit is better)
DROP VIEW IF EXISTS public.transaction_observers_safe;

CREATE VIEW public.transaction_observers_safe
WITH (security_invoker = true)
AS
SELECT
  id,
  transaction_id,
  observer_name,
  observer_email,
  observer_role,
  permissions,
  milestone_ids,
  invited_by,
  invite_accepted,
  expires_at,
  created_at
FROM public.transaction_observers;
