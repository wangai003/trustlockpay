
-- arbitrator_sessions
DROP POLICY IF EXISTS "Admins can manage arbitrator sessions" ON public.arbitrator_sessions;
DROP POLICY IF EXISTS "Admins manage arbitrator sessions" ON public.arbitrator_sessions;
DROP POLICY IF EXISTS "Allow public select on arbitrator_sessions" ON public.arbitrator_sessions;
DROP POLICY IF EXISTS "Allow public update on arbitrator_sessions" ON public.arbitrator_sessions;
DROP POLICY IF EXISTS "Public can read arbitrator sessions" ON public.arbitrator_sessions;
DROP POLICY IF EXISTS "Public can update arbitrator sessions" ON public.arbitrator_sessions;
DROP POLICY IF EXISTS "Anyone can read arbitrator sessions" ON public.arbitrator_sessions;
DROP POLICY IF EXISTS "Anyone can update arbitrator sessions" ON public.arbitrator_sessions;

CREATE POLICY "Admins manage arbitrator sessions"
ON public.arbitrator_sessions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- checkout_sessions
DROP POLICY IF EXISTS "Scoped read checkout sessions" ON public.checkout_sessions;
DROP POLICY IF EXISTS "Scoped select checkout sessions" ON public.checkout_sessions;
DROP POLICY IF EXISTS "Auth insert checkout sessions" ON public.checkout_sessions;
DROP POLICY IF EXISTS "Auth create checkout sessions" ON public.checkout_sessions;
DROP POLICY IF EXISTS "Scoped update checkout sessions" ON public.checkout_sessions;
DROP POLICY IF EXISTS "Allow public select on checkout_sessions" ON public.checkout_sessions;
DROP POLICY IF EXISTS "Allow public update on checkout_sessions" ON public.checkout_sessions;
DROP POLICY IF EXISTS "Allow public insert on checkout_sessions" ON public.checkout_sessions;
DROP POLICY IF EXISTS "Public can read checkout sessions" ON public.checkout_sessions;
DROP POLICY IF EXISTS "Public can update checkout sessions" ON public.checkout_sessions;
DROP POLICY IF EXISTS "Public can create checkout sessions" ON public.checkout_sessions;
DROP POLICY IF EXISTS "Anyone can read checkout sessions" ON public.checkout_sessions;
DROP POLICY IF EXISTS "Anyone can update checkout sessions" ON public.checkout_sessions;
DROP POLICY IF EXISTS "Anyone can create checkout sessions" ON public.checkout_sessions;

CREATE POLICY "Scoped select checkout sessions"
ON public.checkout_sessions FOR SELECT TO authenticated
USING (vendor_id::text = auth.uid()::text OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Auth create checkout sessions"
ON public.checkout_sessions FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Scoped update checkout sessions"
ON public.checkout_sessions FOR UPDATE TO authenticated
USING (vendor_id::text = auth.uid()::text OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (vendor_id::text = auth.uid()::text OR public.has_role(auth.uid(), 'admin'));
