
-- ============================================================
-- 1. vendor_settings: hide shipping_api_key_encrypted from clients
-- ============================================================
REVOKE SELECT ON public.vendor_settings FROM authenticated, anon;
GRANT SELECT (
  id, vendor_id, auto_delivery, pay_enabled, payout_tier, notifications,
  updated_at, widget_theme, widget_mode, supported_currencies,
  industry_category, transaction_types, shipping_api_provider,
  auto_milestone_template, marketplace_integrations
) ON public.vendor_settings TO authenticated;
GRANT ALL ON public.vendor_settings TO service_role;

-- ============================================================
-- 2. platform_widget_configs: hide webhook_secret from clients
-- ============================================================
REVOKE SELECT ON public.platform_widget_configs FROM authenticated, anon;
GRANT SELECT (
  id, vendor_id, multi_vendor_enabled, platform_commission_percent,
  product_api_url, webhook_url, white_label_enabled, brand_primary_color,
  brand_logo_url, brand_name, default_industry_override, auto_kyc_passthrough,
  sandbox_mode, allowed_payment_methods, max_order_amount, min_order_amount,
  auto_refund_window_hours, custom_checkout_message, require_buyer_account,
  enable_bulk_onboarding, created_at, updated_at
) ON public.platform_widget_configs TO authenticated;
GRANT ALL ON public.platform_widget_configs TO service_role;

-- ============================================================
-- 3. lender_profiles: hide license_number + jurisdiction from buyers/vendors
-- ============================================================
REVOKE SELECT ON public.lender_profiles FROM authenticated, anon;
GRANT SELECT (
  id, user_id, institution_name, operating_regions, facility_limit,
  sector_focus, logo_url, institution_type, website_url, social_links,
  bio, kyb_status, is_verified, status, terms_template, lender_tier,
  created_at, updated_at
) ON public.lender_profiles TO authenticated;
GRANT ALL ON public.lender_profiles TO service_role;

-- Helper: lender can fetch their own license fields via SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_lender_license_self()
RETURNS TABLE(lending_license_number text, license_jurisdiction text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lending_license_number, license_jurisdiction
  FROM public.lender_profiles
  WHERE user_id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.get_lender_license_self() TO authenticated;

-- ============================================================
-- 4. arbitrator_sessions: tighten token-scoped UPDATE
-- ============================================================
DROP POLICY IF EXISTS "Token-scoped update arbitrator session" ON public.arbitrator_sessions;
CREATE POLICY "Token-scoped update arbitrator session"
  ON public.arbitrator_sessions
  FOR UPDATE
  USING (
    access_token = ((current_setting('request.headers'::text, true))::json ->> 'x-access-token'::text)
    AND status = 'active'
    AND expires_at > now()
  )
  WITH CHECK (
    access_token = ((current_setting('request.headers'::text, true))::json ->> 'x-access-token'::text)
    AND status = 'active'
  );
