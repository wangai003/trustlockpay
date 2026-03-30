-- Fix 1: Scope protection-documents storage read to owners/transaction parties + admins
DROP POLICY IF EXISTS "Auth read protection docs" ON storage.objects;

CREATE POLICY "Owners read protection docs" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'protection-documents' AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.protection_documents pd
      WHERE pd.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.protection_documents pd
      JOIN public.transactions t ON t.id = pd.transaction_id
      WHERE (t.buyer_id = auth.uid() OR t.vendor_id = auth.uid())
    )
  )
);

-- Fix 2: Scope team-evidence storage read to team members + admins
DROP POLICY IF EXISTS "Auth read team evidence" ON storage.objects;

CREATE POLICY "Team members read team evidence" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'team-evidence' AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = auth.uid()
    )
  )
);

-- Fix 3: Replace vendor_plans public read with scoped policy
DROP POLICY IF EXISTS "Public read vendor_plans" ON public.vendor_plans;

CREATE POLICY "Vendors read own plan" ON public.vendor_plans
FOR SELECT TO authenticated
USING (vendor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Fix 4: Replace standalone_links anon full-table read with filtered access
DROP POLICY IF EXISTS "Public read links by id" ON public.standalone_links;

CREATE POLICY "Anon read single link by id" ON public.standalone_links
FOR SELECT TO anon
USING (
  link_id = current_setting('request.headers', true)::json->>'x-link-id'
);