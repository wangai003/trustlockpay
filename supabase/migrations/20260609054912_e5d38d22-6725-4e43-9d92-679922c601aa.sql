
-- 1. Profiles: drop the message_thread branch from the counterparty SELECT policy
DROP POLICY IF EXISTS "Users can view counterparty profiles" ON public.profiles;

CREATE POLICY "Users can view counterparty profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE (t.buyer_id = auth.uid() AND t.vendor_id = profiles.id)
       OR (t.vendor_id = auth.uid() AND t.buyer_id = profiles.id)
  )
);

-- 2. transaction_observers: hide access_token from non-service-role callers
REVOKE SELECT (access_token) ON public.transaction_observers FROM authenticated;
REVOKE SELECT (access_token) ON public.transaction_observers FROM anon;
GRANT SELECT (access_token) ON public.transaction_observers TO service_role;
