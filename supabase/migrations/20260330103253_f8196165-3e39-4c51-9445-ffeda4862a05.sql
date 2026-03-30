
-- crypto_support_queue: keep anon INSERT but require mandatory fields
DROP POLICY IF EXISTS "Anyone can submit crypto support" ON public.crypto_support_queue;
CREATE POLICY "Anyone can submit crypto support scoped"
ON public.crypto_support_queue FOR INSERT TO anon, authenticated
WITH CHECK (
  sender_email IS NOT NULL AND sender_name IS NOT NULL AND length(sender_email) > 0
);
