
-- admin_dept_chat_messages
DROP POLICY IF EXISTS "Allow all access to dept chat" ON public.admin_dept_chat_messages;
DROP POLICY IF EXISTS "Admins can manage dept chat" ON public.admin_dept_chat_messages;
DROP POLICY IF EXISTS "Admins only dept chat" ON public.admin_dept_chat_messages;

CREATE POLICY "Admins only dept chat"
ON public.admin_dept_chat_messages FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- admin_department_transfers
DROP POLICY IF EXISTS "Allow all access to department transfers" ON public.admin_department_transfers;
DROP POLICY IF EXISTS "Admins can manage department transfers" ON public.admin_department_transfers;
DROP POLICY IF EXISTS "Admins only dept transfers" ON public.admin_department_transfers;

CREATE POLICY "Admins only dept transfers"
ON public.admin_department_transfers FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- admin_cross_department_alerts
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.admin_cross_department_alerts;
DROP POLICY IF EXISTS "Admins can manage cross-department alerts" ON public.admin_cross_department_alerts;
DROP POLICY IF EXISTS "Admins only cross dept alerts" ON public.admin_cross_department_alerts;

CREATE POLICY "Admins only cross dept alerts"
ON public.admin_cross_department_alerts FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- admin_department_tasks
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.admin_department_tasks;
DROP POLICY IF EXISTS "Admins can manage department tasks" ON public.admin_department_tasks;
DROP POLICY IF EXISTS "Admins only dept tasks" ON public.admin_department_tasks;

CREATE POLICY "Admins only dept tasks"
ON public.admin_department_tasks FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- admin_department_rr_pointer
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.admin_department_rr_pointer;
DROP POLICY IF EXISTS "Admins can manage rr pointer" ON public.admin_department_rr_pointer;
DROP POLICY IF EXISTS "Admins only rr pointer" ON public.admin_department_rr_pointer;

CREATE POLICY "Admins only rr pointer"
ON public.admin_department_rr_pointer FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
