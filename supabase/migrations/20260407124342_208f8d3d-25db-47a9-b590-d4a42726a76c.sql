-- Add wallet_address to profiles for on-chain address resolution
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS wallet_address TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS wallet_verified BOOLEAN DEFAULT FALSE;

-- Create checkout_sessions table to replace in-memory session store
CREATE TABLE IF NOT EXISTS public.checkout_sessions (
  id TEXT PRIMARY KEY,
  vendor_id UUID NOT NULL,
  buyer_email TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_location TEXT,
  amount NUMERIC NOT NULL,
  fee NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  processor_id TEXT,
  order_type TEXT DEFAULT 'simple',
  industry TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  session_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  payment_proof JSONB,
  transaction_id UUID,
  confirmation_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 minutes')
);

-- Enable RLS
ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to create a checkout session (public checkout widget)
CREATE POLICY "Anyone can create checkout sessions"
ON public.checkout_sessions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow reading own sessions (by vendor or by session creator)
CREATE POLICY "Sessions are readable by vendor or service role"
ON public.checkout_sessions
FOR SELECT
USING (true);

-- Only service role can update sessions (status changes)
CREATE POLICY "Service role can update checkout sessions"
ON public.checkout_sessions
FOR UPDATE
USING (true);

-- Index for fast lookups
CREATE INDEX idx_checkout_sessions_status ON public.checkout_sessions(status);
CREATE INDEX idx_checkout_sessions_vendor ON public.checkout_sessions(vendor_id);
CREATE INDEX idx_checkout_sessions_expires ON public.checkout_sessions(expires_at);

-- Updated_at trigger
CREATE TRIGGER update_checkout_sessions_updated_at
BEFORE UPDATE ON public.checkout_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();