-- Harden column-level grants on sensitive credential columns.
-- RLS already restricts row access; this prevents even admins (authenticated role)
-- from reading password hashes via the Data API. Edge functions use service_role.

REVOKE SELECT (auditor_password_hash) ON public.audit_sessions FROM authenticated, anon;
REVOKE SELECT (access_password_hash) ON public.arbitrator_sessions FROM authenticated, anon;

-- Lender license fields: enforce that lenders read these only through
-- the SECURITY DEFINER function get_lender_license_self(), not directly.
REVOKE SELECT (lending_license_number, license_jurisdiction)
  ON public.lender_profiles FROM authenticated, anon;