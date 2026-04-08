
-- 1. CRITICAL: Fix arbitrator_sessions public access
DROP POLICY IF EXISTS "Anyone can read session by token" ON public.arbitrator_sessions;
DROP POLICY IF EXISTS "Arbitrators can update their session via token" ON public.arbitrator_sessions;

CREATE POLICY "Token-scoped read arbitrator session"
ON public.arbitrator_sessions
FOR SELECT TO public
USING (access_token = current_setting('request.header.x-access-token', true));

CREATE POLICY "Token-scoped update arbitrator session"
ON public.arbitrator_sessions
FOR UPDATE TO public
USING (access_token = current_setting('request.header.x-access-token', true))
WITH CHECK (access_token = current_setting('request.header.x-access-token', true));

-- 2. CRITICAL: Fix checkout_sessions public access
DROP POLICY IF EXISTS "Sessions are readable by vendor or service role" ON public.checkout_sessions;
DROP POLICY IF EXISTS "Service role can update checkout sessions" ON public.checkout_sessions;

-- 3. CRITICAL: Fix arbitrator-rulings storage
DROP POLICY IF EXISTS "Anyone can read arbitrator-rulings" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload to arbitrator-rulings" ON storage.objects;

-- 4. WARN: Users read own seed token audit logs
CREATE POLICY "Users read own seed token audit logs"
ON public.seed_token_audit_logs
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 5. WARN: Buyers can view proposals by email match
CREATE POLICY "Buyers can view proposals on their transactions"
ON public.milestone_counter_proposals
FOR SELECT TO authenticated
USING (buyer_email = auth.email());
