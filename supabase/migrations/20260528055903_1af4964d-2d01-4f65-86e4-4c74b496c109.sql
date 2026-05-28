-- Restrict standalone_analytics inserts to caller's own vendor_id
DROP POLICY IF EXISTS "Auth insert standalone analytics" ON public.standalone_analytics;
CREATE POLICY "Auth insert standalone analytics"
ON public.standalone_analytics
FOR INSERT
TO authenticated
WITH CHECK (vendor_id = auth.uid());

-- Restrict widget_analytics inserts to caller's own vendor_id
DROP POLICY IF EXISTS "Auth insert widget analytics" ON public.widget_analytics;
CREATE POLICY "Auth insert widget analytics"
ON public.widget_analytics
FOR INSERT
TO authenticated
WITH CHECK (vendor_id = auth.uid());

-- Remove unconditional public read on vendor_sites; widget edge function uses service role
DROP POLICY IF EXISTS "Public read vendor_sites" ON public.vendor_sites;