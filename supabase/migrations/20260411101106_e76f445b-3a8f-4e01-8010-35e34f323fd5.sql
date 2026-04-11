CREATE POLICY "Anyone can lookup sandbox leads by email"
ON public.sandbox_leads
FOR SELECT
TO anon, authenticated
USING (true);