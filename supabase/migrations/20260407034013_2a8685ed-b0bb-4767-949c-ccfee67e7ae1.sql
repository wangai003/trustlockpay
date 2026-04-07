
-- Arbitration fee orders table
CREATE TABLE public.arbitration_fee_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dispute_id UUID NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL,
  requester_role TEXT NOT NULL CHECK (requester_role IN ('buyer', 'vendor')),
  escrow_amount NUMERIC NOT NULL,
  arbitration_fee NUMERIC NOT NULL,
  tx_id TEXT,
  os_payment_id UUID REFERENCES public.os_payments(id),
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'paid', 'arbitration_active', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.arbitration_fee_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own arbitration orders"
  ON public.arbitration_fee_orders FOR SELECT TO authenticated
  USING (requested_by = auth.uid());

CREATE POLICY "Admins can view all arbitration orders"
  ON public.arbitration_fee_orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create arbitration orders"
  ON public.arbitration_fee_orders FOR INSERT TO authenticated
  WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Admins can update arbitration orders"
  ON public.arbitration_fee_orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_arbitration_fee_orders_updated_at
  BEFORE UPDATE ON public.arbitration_fee_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
