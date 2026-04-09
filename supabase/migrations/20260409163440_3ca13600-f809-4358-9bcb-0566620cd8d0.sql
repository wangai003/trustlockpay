
-- Allow authenticated users to read profiles for user discovery/lookup
CREATE POLICY "Authenticated users can view profiles for lookup"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);
