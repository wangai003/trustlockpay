
-- ============================================================
-- PHASE 1: Commodity Price Snapshot + GPS on Milestones
-- ============================================================

-- Add price snapshot fields to transactions
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS locked_price numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS price_snapshot_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS commodity_unit text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS commodity_quantity numeric DEFAULT NULL;

-- Add GPS fields to transaction_milestones
ALTER TABLE public.transaction_milestones
  ADD COLUMN IF NOT EXISTS gps_latitude double precision DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS gps_longitude double precision DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS gps_accuracy double precision DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS gps_captured_at timestamptz DEFAULT NULL;

-- ============================================================
-- PHASE 2: Corridor onboarding + widget theming
-- ============================================================

-- Add corridor/industry fields to profiles for onboarding customization
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_industry text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS corridor text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS preferred_currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS phone_country_code text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS notification_channels jsonb DEFAULT '["email"]'::jsonb;

-- Add widget theming to vendor_settings
ALTER TABLE public.vendor_settings
  ADD COLUMN IF NOT EXISTS widget_theme jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS widget_mode text DEFAULT 'checkout',
  ADD COLUMN IF NOT EXISTS supported_currencies text[] DEFAULT '{USD}'::text[];

-- ============================================================
-- PHASE 3: Invoice Schema + RFQ + Proforma + Document Gates
-- ============================================================

-- Add invoice_schema to industry_templates
ALTER TABLE public.industry_templates
  ADD COLUMN IF NOT EXISTS invoice_schema jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rfq_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS document_gates jsonb DEFAULT '[]'::jsonb;

-- RFQ Requests table
CREATE TABLE IF NOT EXISTS public.rfq_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid DEFAULT NULL,
  vendor_id uuid DEFAULT NULL,
  transaction_id uuid REFERENCES public.transactions(id) DEFAULT NULL,
  industry text DEFAULT NULL,
  rfq_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  buyer_name text DEFAULT NULL,
  buyer_email text DEFAULT NULL,
  buyer_company text DEFAULT NULL,
  buyer_location text DEFAULT NULL,
  specifications jsonb DEFAULT '{}'::jsonb,
  required_documents jsonb DEFAULT '[]'::jsonb,
  requested_delivery_date timestamptz DEFAULT NULL,
  quantity numeric DEFAULT NULL,
  unit text DEFAULT NULL,
  incoterms text DEFAULT NULL,
  notes text DEFAULT NULL,
  vendor_response_at timestamptz DEFAULT NULL,
  expires_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rfq_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors read own rfqs" ON public.rfq_requests
  FOR SELECT TO authenticated
  USING (vendor_id = auth.uid() OR buyer_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Auth insert rfqs" ON public.rfq_requests
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Parties update rfqs" ON public.rfq_requests
  FOR UPDATE TO authenticated
  USING (vendor_id = auth.uid() OR buyer_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anon read rfqs by vendor" ON public.rfq_requests
  FOR SELECT TO anon
  USING (true);

-- Proforma Invoices table
CREATE TABLE IF NOT EXISTS public.proforma_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid REFERENCES public.rfq_requests(id) DEFAULT NULL,
  vendor_id uuid DEFAULT NULL,
  buyer_id uuid DEFAULT NULL,
  transaction_id uuid REFERENCES public.transactions(id) DEFAULT NULL,
  proforma_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  tax_items jsonb DEFAULT '[]'::jsonb,
  subtotal numeric DEFAULT 0,
  tax_total numeric DEFAULT 0,
  grand_total numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  locked_price numeric DEFAULT NULL,
  commodity_unit text DEFAULT NULL,
  commodity_quantity numeric DEFAULT NULL,
  incoterms text DEFAULT NULL,
  payment_terms text DEFAULT NULL,
  validity_days integer DEFAULT 30,
  delivery_terms text DEFAULT NULL,
  shipping_method text DEFAULT NULL,
  insurance_required boolean DEFAULT false,
  insurance_details jsonb DEFAULT NULL,
  document_gates jsonb DEFAULT '[]'::jsonb,
  gate_status jsonb DEFAULT '{}'::jsonb,
  industry text DEFAULT NULL,
  notes text DEFAULT NULL,
  accepted_at timestamptz DEFAULT NULL,
  rejected_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.proforma_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors read own proformas" ON public.proforma_invoices
  FOR SELECT TO authenticated
  USING (vendor_id = auth.uid() OR buyer_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Auth insert proformas" ON public.proforma_invoices
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Parties update proformas" ON public.proforma_invoices
  FOR UPDATE TO authenticated
  USING (vendor_id = auth.uid() OR buyer_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anon read proformas" ON public.proforma_invoices
  FOR SELECT TO anon
  USING (true);

-- ============================================================
-- MISSING FEATURES: Multi-currency, Bulk orders, Corridor analytics
-- ============================================================

-- Supported currencies reference
CREATE TABLE IF NOT EXISTS public.supported_currencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code text NOT NULL UNIQUE,
  currency_name text NOT NULL,
  symbol text DEFAULT NULL,
  country_codes text[] DEFAULT '{}'::text[],
  is_active boolean DEFAULT true,
  exchange_rate_to_usd numeric DEFAULT 1.0,
  rate_updated_at timestamptz DEFAULT now(),
  is_mobile_money boolean DEFAULT false,
  mobile_money_provider text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supported_currencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read currencies" ON public.supported_currencies
  FOR SELECT TO anon, authenticated
  USING (true);

-- Seed initial African currencies
INSERT INTO public.supported_currencies (currency_code, currency_name, symbol, country_codes, is_mobile_money, mobile_money_provider) VALUES
  ('USD', 'US Dollar', '$', '{US}', false, null),
  ('NGN', 'Nigerian Naira', '₦', '{NG}', false, null),
  ('KES', 'Kenyan Shilling', 'KSh', '{KE}', true, 'M-Pesa'),
  ('ZAR', 'South African Rand', 'R', '{ZA}', false, null),
  ('GHS', 'Ghanaian Cedi', 'GH₵', '{GH}', true, 'MTN MoMo'),
  ('UGX', 'Ugandan Shilling', 'USh', '{UG}', true, 'MTN MoMo'),
  ('TZS', 'Tanzanian Shilling', 'TSh', '{TZ}', true, 'M-Pesa'),
  ('XOF', 'West African CFA Franc', 'CFA', '{SN,CI,BF,ML,NE,TG,BJ,GW}', true, 'MTN MoMo'),
  ('XAF', 'Central African CFA Franc', 'FCFA', '{CM,CF,TD,CG,GQ,GA}', false, null),
  ('AOA', 'Angolan Kwanza', 'Kz', '{AO}', false, null),
  ('MZN', 'Mozambican Metical', 'MT', '{MZ}', false, null),
  ('ETB', 'Ethiopian Birr', 'Br', '{ET}', false, null)
ON CONFLICT (currency_code) DO NOTHING;

-- Bulk/Recurring orders
CREATE TABLE IF NOT EXISTS public.recurring_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid DEFAULT NULL,
  buyer_id uuid DEFAULT NULL,
  title text NOT NULL,
  industry text DEFAULT NULL,
  frequency text DEFAULT 'monthly',
  base_amount numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  commodity_unit text DEFAULT NULL,
  commodity_quantity numeric DEFAULT NULL,
  auto_renew boolean DEFAULT true,
  next_due_at timestamptz DEFAULT NULL,
  last_executed_at timestamptz DEFAULT NULL,
  template_milestones jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'active',
  total_executions integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recurring_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read recurring orders" ON public.recurring_orders
  FOR SELECT TO authenticated
  USING (vendor_id = auth.uid() OR buyer_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Auth insert recurring orders" ON public.recurring_orders
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Owners update recurring orders" ON public.recurring_orders
  FOR UPDATE TO authenticated
  USING (vendor_id = auth.uid() OR buyer_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Trade bloc tariff rules
CREATE TABLE IF NOT EXISTS public.trade_bloc_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bloc_name text NOT NULL,
  bloc_code text NOT NULL,
  member_countries text[] DEFAULT '{}'::text[],
  preferential_rate numeric DEFAULT 0,
  standard_external_rate numeric DEFAULT 0,
  rules_of_origin jsonb DEFAULT '{}'::jsonb,
  documentation_required text[] DEFAULT '{}'::text[],
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trade_bloc_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read trade bloc rules" ON public.trade_bloc_rules
  FOR SELECT TO anon, authenticated
  USING (true);

-- Seed trade blocs
INSERT INTO public.trade_bloc_rules (bloc_name, bloc_code, member_countries, preferential_rate, standard_external_rate, documentation_required) VALUES
  ('African Continental Free Trade Area', 'AfCFTA', '{DZ,AO,BJ,BW,BF,BI,CM,CV,CF,TD,KM,CG,CD,CI,DJ,EG,GQ,ER,SZ,ET,GA,GM,GH,GN,GW,KE,LS,LR,LY,MG,MW,ML,MR,MU,MA,MZ,NA,NE,NG,RW,ST,SN,SC,SL,SO,ZA,SS,SD,TZ,TG,TN,UG,ZM,ZW}', 0, 10, '{certificate_of_origin,customs_declaration}'),
  ('Economic Community of West African States', 'ECOWAS', '{BJ,BF,CV,CI,GM,GH,GN,GW,LR,ML,NE,NG,SN,SL,TG}', 0, 12, '{ecowas_certificate,trade_license}'),
  ('Southern African Development Community', 'SADC', '{AO,BW,CD,KM,SZ,LS,MG,MW,MU,MZ,NA,SC,ZA,TZ,ZM,ZW}', 0, 8, '{sadc_certificate,rules_of_origin}'),
  ('East African Community', 'EAC', '{BI,CD,KE,RW,SS,TZ,UG}', 0, 10, '{eac_certificate,customs_form}')
ON CONFLICT DO NOTHING;

-- Corridor analytics tracking
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS corridor_route text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS settlement_currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS settlement_completed_at timestamptz DEFAULT NULL;
