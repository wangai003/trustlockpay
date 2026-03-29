
-- Table to track vendor rejection events with gas/refund analytics
CREATE TABLE public.vendor_rejections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE,
  tx_id text,
  vendor_id uuid,
  buyer_id uuid,
  vendor_name text,
  buyer_name text,
  original_amount numeric NOT NULL DEFAULT 0,
  gas_deducted numeric NOT NULL DEFAULT 0,
  refund_amount numeric NOT NULL DEFAULT 0,
  industry text,
  rejection_reason text,
  refund_status text NOT NULL DEFAULT 'initiated',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vendor_rejections ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins manage vendor rejections"
  ON public.vendor_rejections
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Parties can read their own rejections
CREATE POLICY "Parties read own rejections"
  ON public.vendor_rejections
  FOR SELECT
  TO authenticated
  USING (buyer_id = auth.uid() OR vendor_id = auth.uid());

-- Service insert (from edge functions)
CREATE POLICY "Auth insert vendor rejections"
  ON public.vendor_rejections
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
