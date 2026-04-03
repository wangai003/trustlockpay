
CREATE TABLE public.gas_reserve_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  order_amount NUMERIC NOT NULL DEFAULT 0,
  reserve_rate NUMERIC NOT NULL DEFAULT 0.0001,
  reserve_usd NUMERIC NOT NULL DEFAULT 0,
  reserve_matic NUMERIC NOT NULL DEFAULT 0,
  matic_price_usd NUMERIC NOT NULL DEFAULT 0.40,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  converted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.gas_reserve_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage gas reserve ledger"
ON public.gas_reserve_ledger
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_gas_reserve_status ON public.gas_reserve_ledger(status);
CREATE INDEX idx_gas_reserve_created ON public.gas_reserve_ledger(created_at DESC);
