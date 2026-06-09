
-- 1) arbitrator_sessions
DROP POLICY IF EXISTS "Token-scoped update arbitrator session" ON public.arbitrator_sessions;
CREATE POLICY "No direct authenticated update arbitrator session"
  ON public.arbitrator_sessions FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);

-- 2) transaction_observers
DROP POLICY IF EXISTS "Parties read own observers no token" ON public.transaction_observers;
CREATE POLICY "No direct authenticated read on transaction_observers"
  ON public.transaction_observers FOR SELECT TO authenticated USING (false);

DROP VIEW IF EXISTS public.transaction_observers_safe CASCADE;
CREATE VIEW public.transaction_observers_safe
WITH (security_invoker = off) AS
SELECT
  o.id, o.transaction_id, o.observer_name, o.observer_email, o.observer_role,
  o.permissions, o.milestone_ids, o.invited_by, o.invite_accepted, o.expires_at, o.created_at
FROM public.transaction_observers o
WHERE
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = o.transaction_id
      AND (t.buyer_id = auth.uid() OR t.vendor_id = auth.uid())
  );
GRANT SELECT ON public.transaction_observers_safe TO authenticated;

-- 3) milestone_counter_proposals
DROP POLICY IF EXISTS "Vendors read own proposals after acceptance" ON public.milestone_counter_proposals;

CREATE OR REPLACE FUNCTION public.get_vendor_counter_proposals()
RETURNS TABLE (
  id uuid, proposal_number text, vendor_id uuid, buyer_id uuid, site_id text,
  industry text, order_item text, order_amount numeric,
  vendor_schedule jsonb, proposed_schedule jsonb,
  status text, vendor_notes text, standalone_link_id text,
  created_at timestamptz, updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, proposal_number, vendor_id, buyer_id, site_id,
         industry, order_item, order_amount,
         vendor_schedule, proposed_schedule,
         status, vendor_notes, standalone_link_id,
         created_at, updated_at
  FROM public.milestone_counter_proposals
  WHERE vendor_id = auth.uid() AND status = 'accepted';
$$;
GRANT EXECUTE ON FUNCTION public.get_vendor_counter_proposals() TO authenticated;

-- 4) rfq_requests
DROP POLICY IF EXISTS "Vendors read own RFQs after acceptance" ON public.rfq_requests;

-- 5) vendor_settings
REVOKE SELECT (shipping_api_key_encrypted) ON public.vendor_settings FROM anon, authenticated, PUBLIC;

-- 6) profiles
DROP POLICY IF EXISTS "Users can view counterparty profiles" ON public.profiles;

CREATE OR REPLACE FUNCTION public.get_counterparty_profiles(_ids uuid[])
RETURNS TABLE (
  id uuid, full_name text, email text, avatar_url text, company_name text,
  entity_type text, account_type text, location text,
  onboarding_industry text, corridor text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name, p.email, p.avatar_url, p.company_name,
         p.entity_type, p.account_type, p.location,
         p.onboarding_industry, p.corridor
  FROM public.profiles p
  WHERE p.id = ANY(_ids)
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR p.id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.transactions t
        WHERE (t.buyer_id = auth.uid() AND t.vendor_id = p.id)
           OR (t.vendor_id = auth.uid() AND t.buyer_id = p.id)
      )
    );
$$;
GRANT EXECUTE ON FUNCTION public.get_counterparty_profiles(uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_vendor_display(_id uuid)
RETURNS TABLE (id uuid, full_name text, company_name text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, full_name, company_name, avatar_url
  FROM public.profiles
  WHERE id = _id;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_vendor_display(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.search_counterparty_profiles(_query text, _limit int DEFAULT 20)
RETURNS TABLE (
  id uuid, full_name text, email text, company_name text,
  entity_type text, account_type text, avatar_url text,
  location text, onboarding_industry text, corridor text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name, p.email, p.company_name,
         p.entity_type, p.account_type, p.avatar_url,
         p.location, p.onboarding_industry, p.corridor
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.id <> auth.uid()
    AND (
      p.full_name ILIKE '%' || _query || '%'
      OR p.company_name ILIKE '%' || _query || '%'
      OR p.email ILIKE '%' || _query || '%'
    )
  LIMIT GREATEST(1, LEAST(_limit, 50));
$$;
GRANT EXECUTE ON FUNCTION public.search_counterparty_profiles(text, int) TO authenticated;
