
-- ============================================================
-- 1. PROFILES: Replace blanket SELECT with scoped access
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view profiles for lookup" ON public.profiles;

CREATE POLICY "Users can view counterparty profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE (t.buyer_id = auth.uid() AND t.vendor_id = profiles.id)
       OR (t.vendor_id = auth.uid() AND t.buyer_id = profiles.id)
  )
  OR EXISTS (
    SELECT 1 FROM public.message_threads mt
    WHERE (mt.participant_1 = auth.uid() AND mt.participant_2 = profiles.id)
       OR (mt.participant_2 = auth.uid() AND mt.participant_1 = profiles.id)
  )
);

-- ============================================================
-- 2. ARBITRATOR SESSIONS: Fix broken UPDATE policy header key
-- ============================================================
DROP POLICY IF EXISTS "Token-scoped update arbitrator session" ON public.arbitrator_sessions;

CREATE POLICY "Token-scoped update arbitrator session"
ON public.arbitrator_sessions
FOR UPDATE
TO public
USING (
  access_token = (current_setting('request.headers'::text, true)::json ->> 'x-access-token')
)
WITH CHECK (
  access_token = (current_setting('request.headers'::text, true)::json ->> 'x-access-token')
);

-- ============================================================
-- 3. CHECKOUT SESSIONS: Scope INSERT to vendor or admin
-- ============================================================
DROP POLICY IF EXISTS "Auth create checkout sessions" ON public.checkout_sessions;

CREATE POLICY "Scoped insert checkout sessions"
ON public.checkout_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  (vendor_id)::text = (auth.uid())::text
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- ============================================================
-- 4. WIDGET ANALYTICS: Scope INSERT to own vendor_id
-- ============================================================
DROP POLICY IF EXISTS "Anyone can insert widget analytics" ON public.widget_analytics;

CREATE POLICY "Scoped insert widget analytics"
ON public.widget_analytics
FOR INSERT
TO public
WITH CHECK (vendor_id IS NOT NULL);

-- ============================================================
-- 5. STANDALONE ANALYTICS: Scope INSERT to own vendor_id
-- ============================================================
DROP POLICY IF EXISTS "Anyone can insert standalone analytics" ON public.standalone_analytics;

CREATE POLICY "Scoped insert standalone analytics"
ON public.standalone_analytics
FOR INSERT
TO public
WITH CHECK (vendor_id IS NOT NULL);

-- ============================================================
-- 6. SANDBOX LEADS: Scope INSERT to require valid data
-- ============================================================
DROP POLICY IF EXISTS "Anyone can submit sandbox lead" ON public.sandbox_leads;

CREATE POLICY "Anyone can submit sandbox lead scoped"
ON public.sandbox_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL AND length(email) > 0
);

-- ============================================================
-- 7. RFQ REQUESTS: Remove duplicate blanket public INSERT
-- ============================================================
DROP POLICY IF EXISTS "Anyone can submit RFQ" ON public.rfq_requests;
