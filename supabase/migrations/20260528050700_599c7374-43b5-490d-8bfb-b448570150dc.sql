
-- Lock down sandbox_leads: remove open public SELECT
DROP POLICY IF EXISTS "Anyone can lookup sandbox leads by email" ON public.sandbox_leads;

-- Lock down admin_departments: only admins can read
DROP POLICY IF EXISTS "Authenticated users can read departments" ON public.admin_departments;
CREATE POLICY "Admins can read departments"
  ON public.admin_departments
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Lock down platform_config: only admins can read
DROP POLICY IF EXISTS "Authenticated users can read config" ON public.platform_config;
CREATE POLICY "Admins can read platform config"
  ON public.platform_config
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
