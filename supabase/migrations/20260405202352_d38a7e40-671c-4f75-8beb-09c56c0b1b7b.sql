
-- Drop the old restrictive SELECT policy
DROP POLICY IF EXISTS "No public read access to leads" ON public.sandbox_leads;

-- Allow authenticated users to read (admin panel uses authenticated session)
CREATE POLICY "Authenticated users can read leads"
  ON public.sandbox_leads
  FOR SELECT
  TO authenticated
  USING (true);
