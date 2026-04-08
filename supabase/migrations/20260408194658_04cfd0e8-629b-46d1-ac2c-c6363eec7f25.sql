
-- Fix audit_sessions (policy already exists from partial run)
DROP POLICY IF EXISTS "Admins manage audit sessions" ON public.audit_sessions;
CREATE POLICY "Admins manage audit sessions"
ON public.audit_sessions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix milestone_counter_proposals INSERT
DROP POLICY IF EXISTS "Anyone can insert counter proposals" ON public.milestone_counter_proposals;
DROP POLICY IF EXISTS "Authenticated users insert own counter proposals" ON public.milestone_counter_proposals;
CREATE POLICY "Authenticated users insert own counter proposals"
ON public.milestone_counter_proposals FOR INSERT TO authenticated
WITH CHECK (vendor_id = auth.uid() OR buyer_email = auth.email());

-- Fix vendor_claim_tokens
DROP POLICY IF EXISTS "Anyone can read claim token by token value" ON public.vendor_claim_tokens;
DROP POLICY IF EXISTS "Admins manage claim tokens" ON public.vendor_claim_tokens;

CREATE OR REPLACE FUNCTION public.get_vendor_claim_by_token(p_token text)
RETURNS TABLE (id uuid, vendor_name text, status text, expires_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT t.id, t.vendor_name, t.status, t.expires_at
  FROM public.vendor_claim_tokens t
  WHERE t.token = p_token AND t.status = 'pending' AND t.expires_at > now()
  LIMIT 1;
$$;

CREATE POLICY "Admins manage claim tokens"
ON public.vendor_claim_tokens FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix arbitrator-rulings storage
DROP POLICY IF EXISTS "Auth read arbitrator rulings" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload arbitrator rulings" ON storage.objects;
DROP POLICY IF EXISTS "Admins read arbitrator rulings" ON storage.objects;
DROP POLICY IF EXISTS "Admins upload arbitrator rulings" ON storage.objects;

CREATE POLICY "Admins read arbitrator rulings"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'arbitrator-rulings' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins upload arbitrator rulings"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'arbitrator-rulings' AND public.has_role(auth.uid(), 'admin'));
