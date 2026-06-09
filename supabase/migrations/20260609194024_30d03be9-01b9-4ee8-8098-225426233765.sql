
-- 1. admin_accounts: revoke SELECT on password hash columns from anon/authenticated
REVOKE SELECT (password_hash, temp_password_hash) ON public.admin_accounts FROM anon, authenticated;

-- 2. arbitrator_sessions: revoke SELECT on secret token/hash from anon/authenticated
REVOKE SELECT (access_token, access_password_hash) ON public.arbitrator_sessions FROM anon, authenticated;

-- 3. audit_sessions: revoke SELECT on password hash from anon/authenticated
REVOKE SELECT (auditor_password_hash) ON public.audit_sessions FROM anon, authenticated;

-- 4. lender_profiles: revoke SELECT on regulatory identifiers from anon/authenticated
-- (Admins use service_role / has_role admin checks via separate flows that bypass column grants when needed)
REVOKE SELECT (lending_license_number, license_jurisdiction) ON public.lender_profiles FROM anon, authenticated;
-- Re-grant to service_role for admin tooling
GRANT SELECT (lending_license_number, license_jurisdiction) ON public.lender_profiles TO service_role;

-- 5. milestone_counter_proposals: add vendor SELECT policy
DROP POLICY IF EXISTS "Vendors view their counter proposals" ON public.milestone_counter_proposals;
CREATE POLICY "Vendors view their counter proposals"
  ON public.milestone_counter_proposals
  FOR SELECT
  TO authenticated
  USING (vendor_id = auth.uid());

-- 6. vendor_sites: add anon SELECT policy scoped to active sites (display-safe columns)
DROP POLICY IF EXISTS "Anon read active vendor sites" ON public.vendor_sites;
CREATE POLICY "Anon read active vendor sites"
  ON public.vendor_sites
  FOR SELECT
  TO anon
  USING (is_active = true);
GRANT SELECT (id, vendor_id, name, url, platform, industry, created_at, display_currency, default_trade_scope, is_active)
  ON public.vendor_sites TO anon;
