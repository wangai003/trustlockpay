
-- Fix function search_path
ALTER FUNCTION public.increment_lender_exposure(uuid, numeric) SET search_path = public;

-- Add RLS policy to admin_departments (currently has RLS enabled but no policies)
CREATE POLICY "Authenticated users can read departments"
ON public.admin_departments FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins manage departments"
ON public.admin_departments FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
