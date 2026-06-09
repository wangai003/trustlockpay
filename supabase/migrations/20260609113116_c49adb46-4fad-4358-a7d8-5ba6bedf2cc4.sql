
DROP VIEW IF EXISTS public.transaction_observers_safe;

CREATE OR REPLACE FUNCTION public.get_transaction_observers(_transaction_id uuid)
RETURNS TABLE (
  id uuid, transaction_id uuid, observer_name text, observer_email text,
  observer_role text, permissions text[], milestone_ids uuid[],
  invited_by uuid, invite_accepted boolean, expires_at timestamptz, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.id, o.transaction_id, o.observer_name, o.observer_email,
         o.observer_role, o.permissions, o.milestone_ids,
         o.invited_by, o.invite_accepted, o.expires_at, o.created_at
  FROM public.transaction_observers o
  WHERE o.transaction_id = _transaction_id
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.transactions t
        WHERE t.id = o.transaction_id
          AND (t.buyer_id = auth.uid() OR t.vendor_id = auth.uid())
      )
    );
$$;
REVOKE ALL ON FUNCTION public.get_transaction_observers(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_transaction_observers(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_counterparty_profiles(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_counterparty_profiles(uuid[]) TO authenticated;

REVOKE ALL ON FUNCTION public.search_counterparty_profiles(text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_counterparty_profiles(text, int) TO authenticated;

REVOKE ALL ON FUNCTION public.get_vendor_counter_proposals() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_vendor_counter_proposals() TO authenticated;
