
-- Add entity classification to transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS buyer_entity_type text DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS buyer_company_name text,
  ADD COLUMN IF NOT EXISTS vendor_entity_type text DEFAULT 'individual';

-- Rename vendor_id to user_id in business_kyc_profiles for dual-role support
ALTER TABLE public.business_kyc_profiles RENAME COLUMN vendor_id TO user_id;

-- Drop and recreate policies with new column name
DROP POLICY IF EXISTS "Vendors read own business kyc" ON public.business_kyc_profiles;
DROP POLICY IF EXISTS "Vendors insert own business kyc" ON public.business_kyc_profiles;
DROP POLICY IF EXISTS "Vendors update own business kyc" ON public.business_kyc_profiles;

CREATE POLICY "Users read own business kyc"
  ON public.business_kyc_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own business kyc"
  ON public.business_kyc_profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own business kyc"
  ON public.business_kyc_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
