
-- Create reusable timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Business KYC profiles table
CREATE TABLE public.business_kyc_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id uuid NOT NULL,
  company_legal_name text NOT NULL,
  trading_name text,
  registration_number text,
  tax_id text,
  incorporation_date date,
  jurisdiction text,
  business_type text DEFAULT 'limited_company',
  registered_address text,
  business_activity_description text,
  signatory_name text,
  signatory_title text,
  authorization_doc_url text,
  verification_status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendor_id)
);

ALTER TABLE public.business_kyc_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors read own business kyc"
  ON public.business_kyc_profiles FOR SELECT TO authenticated
  USING (vendor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Vendors insert own business kyc"
  ON public.business_kyc_profiles FOR INSERT TO authenticated
  WITH CHECK (vendor_id = auth.uid());

CREATE POLICY "Vendors update own business kyc"
  ON public.business_kyc_profiles FOR UPDATE TO authenticated
  USING (vendor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- UBO declarations table
CREATE TABLE public.ubo_declarations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_kyc_id uuid NOT NULL REFERENCES public.business_kyc_profiles(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  nationality text,
  date_of_birth date,
  ownership_percentage numeric NOT NULL DEFAULT 0,
  id_document_url text,
  address text,
  verification_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ubo_declarations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors read own UBOs"
  ON public.ubo_declarations FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.business_kyc_profiles b
    WHERE b.id = ubo_declarations.business_kyc_id
    AND (b.vendor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  ));

CREATE POLICY "Vendors insert own UBOs"
  ON public.ubo_declarations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.business_kyc_profiles b
    WHERE b.id = ubo_declarations.business_kyc_id
    AND b.vendor_id = auth.uid()
  ));

CREATE POLICY "Vendors update own UBOs"
  ON public.ubo_declarations FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.business_kyc_profiles b
    WHERE b.id = ubo_declarations.business_kyc_id
    AND (b.vendor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  ));

CREATE POLICY "Vendors delete own UBOs"
  ON public.ubo_declarations FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.business_kyc_profiles b
    WHERE b.id = ubo_declarations.business_kyc_id
    AND b.vendor_id = auth.uid()
  ));

-- Timestamp triggers
CREATE TRIGGER update_business_kyc_profiles_updated_at
  BEFORE UPDATE ON public.business_kyc_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ubo_declarations_updated_at
  BEFORE UPDATE ON public.ubo_declarations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
