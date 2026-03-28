
-- Dedicated support queue for pending/failed crypto payment investigations
CREATE TABLE public.crypto_support_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sender_wallet TEXT,
  tx_id TEXT,
  amount_sent NUMERIC,
  token TEXT DEFAULT 'USDC',
  network TEXT DEFAULT 'Polygon',
  source TEXT DEFAULT 'checkout',
  status TEXT NOT NULL DEFAULT 'open',
  admin_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crypto_support_queue ENABLE ROW LEVEL SECURITY;

-- Anon + authenticated can insert (checkout may be unauthenticated)
CREATE POLICY "Anyone can submit crypto support" ON public.crypto_support_queue
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Only admins can read all
CREATE POLICY "Admins read crypto support queue" ON public.crypto_support_queue
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update (resolve cases)
CREATE POLICY "Admins update crypto support queue" ON public.crypto_support_queue
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
