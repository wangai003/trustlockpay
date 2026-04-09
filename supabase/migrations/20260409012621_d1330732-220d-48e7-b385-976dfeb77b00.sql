
DROP VIEW IF EXISTS public.arbitrator_sessions_safe;

CREATE VIEW public.arbitrator_sessions_safe
  WITH (security_barrier = true, security_invoker = true)
AS
  SELECT
    id, access_count, access_token, arbitrator_email, arbitrator_name,
    case_bundle_generated, case_bundle_url, created_at, dispute_id,
    expires_at, last_accessed_at, ruling_anchored, ruling_distributed,
    ruling_file_name, ruling_file_url, ruling_uploaded_at, status,
    transaction_id, updated_at
  FROM public.arbitrator_sessions;
