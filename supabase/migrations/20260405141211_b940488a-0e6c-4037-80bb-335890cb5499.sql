-- Vendor subscriptions table for plan lifecycle tracking
CREATE TABLE public.vendor_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL,
  plan_id text NOT NULL DEFAULT 'basic',
  billing_cycle text NOT NULL DEFAULT 'monthly',
  status text NOT NULL DEFAULT 'active',
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  grace_ends_at timestamptz,
  amount_paid numeric NOT NULL DEFAULT 0,
  payment_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can view own subscriptions"
  ON public.vendor_subscriptions FOR SELECT
  USING (auth.uid() = vendor_id);

CREATE POLICY "System can insert subscriptions"
  ON public.vendor_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = vendor_id);

CREATE POLICY "System can update own subscriptions"
  ON public.vendor_subscriptions FOR UPDATE
  USING (auth.uid() = vendor_id);

CREATE INDEX idx_vendor_subscriptions_vendor ON public.vendor_subscriptions(vendor_id);
CREATE INDEX idx_vendor_subscriptions_status ON public.vendor_subscriptions(status);

-- Vendor bills table for tracking all charges
CREATE TABLE public.vendor_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL,
  bill_type text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  due_date timestamptz,
  paid_at timestamptz,
  site_id uuid REFERENCES public.vendor_sites(id) ON DELETE SET NULL,
  description text,
  reminder_sent_at timestamptz,
  reminder_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can view own bills"
  ON public.vendor_bills FOR SELECT
  USING (auth.uid() = vendor_id);

CREATE POLICY "System can insert bills"
  ON public.vendor_bills FOR INSERT
  WITH CHECK (auth.uid() = vendor_id);

CREATE POLICY "System can update own bills"
  ON public.vendor_bills FOR UPDATE
  USING (auth.uid() = vendor_id);

CREATE INDEX idx_vendor_bills_vendor ON public.vendor_bills(vendor_id);
CREATE INDEX idx_vendor_bills_status ON public.vendor_bills(status);
CREATE INDEX idx_vendor_bills_due ON public.vendor_bills(due_date);

-- Add payment_confirmed flag to vendor_widget_fees
ALTER TABLE public.vendor_widget_fees
ADD COLUMN payment_confirmed boolean NOT NULL DEFAULT false;

-- Trigger for updated_at
CREATE TRIGGER update_vendor_subscriptions_updated_at
  BEFORE UPDATE ON public.vendor_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vendor_bills_updated_at
  BEFORE UPDATE ON public.vendor_bills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();