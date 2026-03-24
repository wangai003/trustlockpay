
-- Transactions table
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_id text UNIQUE NOT NULL,
  buyer_id uuid,
  vendor_id uuid,
  buyer_name text,
  vendor_name text,
  buyer_location text,
  vendor_location text,
  amount numeric NOT NULL DEFAULT 0,
  fee numeric DEFAULT 0,
  item text,
  tracking text,
  status text NOT NULL DEFAULT 'locked',
  type text DEFAULT 'product',
  industry text,
  order_number integer,
  shipped_date timestamptz,
  delivered_date timestamptz,
  released_date timestamptz,
  auto_release_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Disputes table
CREATE TABLE public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id text UNIQUE NOT NULL,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  tx_id text,
  buyer_id uuid,
  vendor_id uuid,
  buyer_name text,
  vendor_name text,
  amount numeric,
  reason text,
  description text,
  status text NOT NULL DEFAULT 'pending',
  priority text DEFAULT 'medium',
  ai_confidence integer,
  ai_recommendation text,
  resolution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Dispute evidence
CREATE TABLE public.dispute_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid REFERENCES public.disputes(id) ON DELETE CASCADE NOT NULL,
  uploaded_by uuid,
  file_url text NOT NULL,
  file_name text,
  file_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Payouts
CREATE TABLE public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id text UNIQUE NOT NULL,
  vendor_id uuid,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  tx_id text,
  amount numeric NOT NULL,
  method text,
  status text NOT NULL DEFAULT 'pending',
  eta text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Vendor sites
CREATE TABLE public.vendor_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid,
  name text NOT NULL,
  platform text,
  url text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- KYC documents
CREATE TABLE public.kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid,
  name text NOT NULL,
  file_url text,
  status text DEFAULT 'pending',
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- OS Payments (TrustLock OS Pay records)
CREATE TABLE public.os_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  role text,
  action text DEFAULT 'payment',
  service text,
  amount numeric NOT NULL,
  fee numeric DEFAULT 0,
  total numeric DEFAULT 0,
  method text,
  status text DEFAULT 'completed',
  refund_email text,
  refund_reason text,
  split_recipient text,
  split_percentage integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Vendor plans
CREATE TABLE public.vendor_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid,
  plan_id text NOT NULL DEFAULT 'basic',
  billing_cycle text DEFAULT 'yearly',
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_trial boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Vendor settings
CREATE TABLE public.vendor_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid UNIQUE,
  auto_delivery boolean DEFAULT false,
  pay_enabled boolean DEFAULT true,
  payout_tier text DEFAULT 'managed',
  notifications jsonb DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Compliance flags
CREATE TABLE public.compliance_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id text UNIQUE NOT NULL,
  type text NOT NULL,
  description text,
  severity text DEFAULT 'medium',
  related_vendor_id uuid,
  related_buyer_id uuid,
  status text DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- KYC verification queue (admin)
CREATE TABLE public.kyc_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kyc_id text UNIQUE NOT NULL,
  vendor_id uuid,
  vendor_name text,
  tier_change text,
  documents text,
  status text DEFAULT 'pending',
  submitted_at timestamptz NOT NULL DEFAULT now()
);

-- Archived reports
CREATE TABLE public.archived_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid,
  owner_role text,
  name text NOT NULL,
  file_type text DEFAULT 'PDF',
  file_size text,
  file_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archived_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow public read for testnet compatibility, authenticated write

-- Transactions
CREATE POLICY "Public read transactions" ON public.transactions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Auth users insert transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users update own transactions" ON public.transactions FOR UPDATE TO authenticated USING (buyer_id = auth.uid() OR vendor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Disputes
CREATE POLICY "Public read disputes" ON public.disputes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Auth users insert disputes" ON public.disputes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users update disputes" ON public.disputes FOR UPDATE TO authenticated USING (buyer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Dispute evidence
CREATE POLICY "Public read evidence" ON public.dispute_evidence FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Auth users insert evidence" ON public.dispute_evidence FOR INSERT TO authenticated WITH CHECK (true);

-- Payouts
CREATE POLICY "Public read payouts" ON public.payouts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Auth insert payouts" ON public.payouts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin update payouts" ON public.payouts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Vendor sites
CREATE POLICY "Public read vendor_sites" ON public.vendor_sites FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Auth insert vendor_sites" ON public.vendor_sites FOR INSERT TO authenticated WITH CHECK (vendor_id = auth.uid());
CREATE POLICY "Owner update vendor_sites" ON public.vendor_sites FOR UPDATE TO authenticated USING (vendor_id = auth.uid());
CREATE POLICY "Owner delete vendor_sites" ON public.vendor_sites FOR DELETE TO authenticated USING (vendor_id = auth.uid());

-- KYC documents
CREATE POLICY "Public read kyc_documents" ON public.kyc_documents FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Auth insert kyc_documents" ON public.kyc_documents FOR INSERT TO authenticated WITH CHECK (vendor_id = auth.uid());

-- OS Payments
CREATE POLICY "Public read os_payments" ON public.os_payments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Auth insert os_payments" ON public.os_payments FOR INSERT TO authenticated WITH CHECK (true);

-- Vendor plans
CREATE POLICY "Public read vendor_plans" ON public.vendor_plans FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Auth insert vendor_plans" ON public.vendor_plans FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Owner update vendor_plans" ON public.vendor_plans FOR UPDATE TO authenticated USING (vendor_id = auth.uid());

-- Vendor settings
CREATE POLICY "Public read vendor_settings" ON public.vendor_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Auth insert vendor_settings" ON public.vendor_settings FOR INSERT TO authenticated WITH CHECK (vendor_id = auth.uid());
CREATE POLICY "Owner update vendor_settings" ON public.vendor_settings FOR UPDATE TO authenticated USING (vendor_id = auth.uid());

-- Compliance flags
CREATE POLICY "Public read compliance_flags" ON public.compliance_flags FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin insert compliance_flags" ON public.compliance_flags FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- KYC queue
CREATE POLICY "Public read kyc_queue" ON public.kyc_queue FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin manage kyc_queue" ON public.kyc_queue FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Archived reports
CREATE POLICY "Public read archived_reports" ON public.archived_reports FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Auth insert archived_reports" ON public.archived_reports FOR INSERT TO authenticated WITH CHECK (true);
