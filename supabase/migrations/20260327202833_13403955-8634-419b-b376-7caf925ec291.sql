
-- Create vendor_consent_records table
CREATE TABLE public.vendor_consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL,
  consent_type text NOT NULL DEFAULT 'auto_signature',
  typed_name text NOT NULL,
  auto_accept_enabled boolean DEFAULT true,
  plan_id text,
  ip_address text,
  user_agent text,
  browser_fingerprint text,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  is_active boolean DEFAULT true
);

-- Unique partial index: only one active consent per type per vendor
CREATE UNIQUE INDEX uq_vendor_consent_active ON public.vendor_consent_records (vendor_id, consent_type) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.vendor_consent_records ENABLE ROW LEVEL SECURITY;

-- Vendors can insert their own
CREATE POLICY "Vendors insert own consent" ON public.vendor_consent_records
  FOR INSERT TO authenticated
  WITH CHECK (vendor_id = auth.uid());

-- Vendors can read their own
CREATE POLICY "Vendors read own consent" ON public.vendor_consent_records
  FOR SELECT TO authenticated
  USING (vendor_id = auth.uid());

-- Vendors can update their own
CREATE POLICY "Vendors update own consent" ON public.vendor_consent_records
  FOR UPDATE TO authenticated
  USING (vendor_id = auth.uid());

-- Admins can read all
CREATE POLICY "Admins read all consent" ON public.vendor_consent_records
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.vendor_consent_records;
