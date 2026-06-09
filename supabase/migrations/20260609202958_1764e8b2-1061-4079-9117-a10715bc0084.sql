
-- Column-level REVOKEs for sensitive fields. RLS still controls row access;
-- these revokes ensure even row-eligible roles cannot SELECT the listed columns
-- through the Data API. Service role retains access for edge functions.

REVOKE SELECT (access_token, access_password_hash) ON public.arbitrator_sessions FROM authenticated, anon;
REVOKE SELECT (access_token, auditor_password_hash) ON public.audit_sessions FROM authenticated, anon;
REVOKE SELECT (lending_license_number, license_jurisdiction) ON public.lender_profiles FROM authenticated, anon;
REVOKE SELECT (api_key_hash) ON public.platform_api_keys FROM authenticated, anon;
REVOKE SELECT (webhook_secret) ON public.platform_widget_configs FROM authenticated, anon;
REVOKE SELECT (token) ON public.seed_tokens FROM authenticated, anon;
REVOKE SELECT (access_token) ON public.transaction_observers FROM authenticated, anon;
REVOKE SELECT (token) ON public.vendor_claim_tokens FROM authenticated, anon;
REVOKE SELECT (shipping_api_key_encrypted) ON public.vendor_settings FROM authenticated, anon;
REVOKE SELECT (payment_proof, session_data) ON public.checkout_sessions FROM authenticated, anon;
REVOKE SELECT (ip_address, user_agent) ON public.tos_acceptances FROM authenticated, anon;

-- Profiles: keep public-facing fields readable, but lock down PII columns.
-- Admins should query PII through an edge function using service_role.
REVOKE SELECT (email, phone, business_email, business_phone, wallet_address) ON public.profiles FROM anon;
-- For authenticated, retain self-read by relying on RLS + still revoking broad column read by admins via Data API:
-- We cannot conditionally revoke per row; users reading their own profile via Data API still need these columns,
-- so we keep authenticated SELECT on these columns. RLS already prevents cross-user reads except for admins,
-- and admin bulk PII extraction concern is mitigated by application-level access patterns.
