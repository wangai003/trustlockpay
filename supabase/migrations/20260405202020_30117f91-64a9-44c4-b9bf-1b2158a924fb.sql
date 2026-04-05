
CREATE TABLE public.sandbox_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  country_code TEXT DEFAULT '+1',
  role TEXT DEFAULT 'vendor',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sandbox_leads ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (sandbox doesn't require auth)
CREATE POLICY "Anyone can submit sandbox lead"
  ON public.sandbox_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only authenticated admins can read leads (via service role in admin panel)
CREATE POLICY "No public read access to leads"
  ON public.sandbox_leads
  FOR SELECT
  TO authenticated
  USING (false);
