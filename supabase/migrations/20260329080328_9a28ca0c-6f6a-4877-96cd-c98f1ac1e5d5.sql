
-- Tax ledger: tracks every tax/tariff collected per transaction for manual remittance
CREATE TABLE public.tax_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  order_number text,
  tx_id text,
  
  -- Tax details
  tax_type text NOT NULL DEFAULT 'vat',
  tax_jurisdiction text NOT NULL,
  jurisdiction_country_code text,
  tax_authority_name text,
  
  -- Amounts
  taxable_amount numeric NOT NULL DEFAULT 0,
  tax_rate numeric NOT NULL DEFAULT 0,
  tax_collected numeric NOT NULL DEFAULT 0,
  tariff_collected numeric NOT NULL DEFAULT 0,
  total_collected numeric NOT NULL DEFAULT 0,
  
  -- Industry context
  industry text,
  item_category text,
  buyer_country text,
  vendor_country text,
  corridor_route text,
  
  -- Remittance tracking
  remittance_status text NOT NULL DEFAULT 'pending',
  remitted_at timestamptz,
  remitted_by text,
  remittance_reference text,
  remittance_notes text,
  
  -- Period tracking for filing
  collection_period text,
  fiscal_quarter text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.tax_ledger ENABLE ROW LEVEL SECURITY;

-- Only admins can read/manage the tax ledger
CREATE POLICY "Admins manage tax ledger"
  ON public.tax_ledger FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role can insert (from edge functions)
CREATE POLICY "Service insert tax ledger"
  ON public.tax_ledger FOR INSERT
  TO authenticated
  WITH CHECK (true);
