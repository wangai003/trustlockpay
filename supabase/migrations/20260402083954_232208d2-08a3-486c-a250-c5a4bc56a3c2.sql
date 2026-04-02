-- Create ToS acceptances table
CREATE TABLE public.tos_acceptances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tos_version TEXT NOT NULL DEFAULT '1.0',
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, tos_version)
);

-- Enable RLS
ALTER TABLE public.tos_acceptances ENABLE ROW LEVEL SECURITY;

-- Users can read own
CREATE POLICY "Users read own tos acceptances"
ON public.tos_acceptances FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert own
CREATE POLICY "Users insert own tos acceptance"
ON public.tos_acceptances FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Admins read all
CREATE POLICY "Admins read all tos acceptances"
ON public.tos_acceptances FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));