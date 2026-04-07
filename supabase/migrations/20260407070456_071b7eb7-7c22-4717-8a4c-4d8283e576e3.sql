
-- Arbitrator portal sessions
CREATE TABLE public.arbitrator_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dispute_id UUID NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.transactions(id),
  access_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex') UNIQUE,
  access_password TEXT NOT NULL,
  arbitrator_name TEXT NOT NULL,
  arbitrator_email TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  case_bundle_generated BOOLEAN NOT NULL DEFAULT false,
  case_bundle_url TEXT,
  ruling_file_url TEXT,
  ruling_file_name TEXT,
  ruling_uploaded_at TIMESTAMPTZ,
  ruling_anchored BOOLEAN NOT NULL DEFAULT false,
  ruling_distributed BOOLEAN NOT NULL DEFAULT false,
  access_count INTEGER NOT NULL DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '90 days')
);

ALTER TABLE public.arbitrator_sessions ENABLE ROW LEVEL SECURITY;

-- Public read by token (for the portal page)
CREATE POLICY "Anyone can read session by token"
  ON public.arbitrator_sessions FOR SELECT
  USING (true);

-- Admins can insert/update
CREATE POLICY "Admins can manage arbitrator sessions"
  ON public.arbitrator_sessions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow anonymous updates for ruling uploads (by token match)
CREATE POLICY "Arbitrators can update their session via token"
  ON public.arbitrator_sessions FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_arbitrator_sessions_updated_at
  BEFORE UPDATE ON public.arbitrator_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for arbitrator ruling uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('arbitrator-rulings', 'arbitrator-rulings', false);

CREATE POLICY "Anyone can upload to arbitrator-rulings"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'arbitrator-rulings');

CREATE POLICY "Anyone can read arbitrator-rulings"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'arbitrator-rulings');
