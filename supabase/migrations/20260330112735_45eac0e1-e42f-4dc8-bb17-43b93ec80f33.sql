DROP POLICY IF EXISTS "Public read vendor_settings" ON public.vendor_settings;

CREATE POLICY "Owners read own vendor_settings"
ON public.vendor_settings
FOR SELECT
TO authenticated
USING (vendor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));