
-- Create pre_order_contracts table
CREATE TABLE public.pre_order_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES public.transactions(id),
  order_number text,
  buyer_id uuid,
  vendor_id uuid,
  industry text,
  order_amount numeric,
  milestone_count integer DEFAULT 1,
  buyer_typed_name text,
  vendor_typed_name text,
  is_vendor_auto_signed boolean DEFAULT false,
  buyer_signed_at timestamptz,
  vendor_signed_at timestamptz,
  buyer_ip text,
  vendor_ip text,
  buyer_user_agent text,
  vendor_user_agent text,
  contract_terms_version text DEFAULT '1.0',
  industry_addendum text,
  status text DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pre_order_contracts ENABLE ROW LEVEL SECURITY;

-- Buyers/vendors can read their own
CREATE POLICY "Buyers read own contracts" ON public.pre_order_contracts
  FOR SELECT TO authenticated
  USING (buyer_id = auth.uid());

CREATE POLICY "Vendors read own contracts" ON public.pre_order_contracts
  FOR SELECT TO authenticated
  USING (vendor_id = auth.uid());

-- Admins read all
CREATE POLICY "Admins read all contracts" ON public.pre_order_contracts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Auth users can insert
CREATE POLICY "Auth insert contracts" ON public.pre_order_contracts
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Status updates by buyer, vendor, or admin
CREATE POLICY "Parties update own contracts" ON public.pre_order_contracts
  FOR UPDATE TO authenticated
  USING (buyer_id = auth.uid() OR vendor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.pre_order_contracts;
