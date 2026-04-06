-- 1. Fix sandbox_leads: restrict SELECT to admins only
DROP POLICY IF EXISTS "Authenticated users can read leads" ON public.sandbox_leads;
CREATE POLICY "Admins can read leads"
  ON public.sandbox_leads
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Fix protection-documents storage: remove overly broad policy
DROP POLICY IF EXISTS "Authenticated users can read protection documents" ON storage.objects;

-- 3. Remove sensitive admin tables from Realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.thread_internal_notes;
ALTER PUBLICATION supabase_realtime DROP TABLE public.admin_direct_messages;

-- 4. Fix milestone_counter_proposals: require authentication
DROP POLICY IF EXISTS "Anyone can submit a counter-proposal" ON public.milestone_counter_proposals;
CREATE POLICY "Authenticated users can submit counter-proposals"
  ON public.milestone_counter_proposals
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 5. Fix escrow_extensions: add admin policies
CREATE POLICY "Admins can view all extensions"
  ON public.escrow_extensions
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update extensions"
  ON public.escrow_extensions
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. Fix vendor_claim_tokens: tighten claim policy to require token match
DROP POLICY IF EXISTS "Users claim tokens" ON public.vendor_claim_tokens;
CREATE POLICY "Users claim tokens with matching token"
  ON public.vendor_claim_tokens
  FOR UPDATE
  TO authenticated
  USING (
    status = 'pending'
    AND (claimed_by IS NULL OR claimed_by = auth.uid())
    AND token = ((current_setting('request.headers', true))::json ->> 'x-claim-token')
  );