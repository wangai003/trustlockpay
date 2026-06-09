
-- 1) vendor_risk_scores
DROP POLICY IF EXISTS "Lenders can view vendor risk scores" ON public.vendor_risk_scores;
CREATE POLICY "Risk scores visible to vendor, linked lenders, admins"
ON public.vendor_risk_scores
FOR SELECT TO authenticated
USING (
  vendor_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.financing_applications fa
    WHERE fa.vendor_id = vendor_risk_scores.vendor_id
      AND fa.lender_id = auth.uid()
      AND fa.status IN ('submitted','approved','active','returned','funded','repaying','closed')
  )
);

-- 2) disputes UPDATE: WITH CHECK + trigger for column-level immutability
DROP POLICY IF EXISTS "Auth users update disputes" ON public.disputes;
CREATE POLICY "Parties update own dispute narrative"
ON public.disputes
FOR UPDATE TO authenticated
USING (buyer_id = auth.uid() OR vendor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (buyer_id = auth.uid() OR vendor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.enforce_dispute_update_scope()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.resolution IS DISTINCT FROM OLD.resolution
     OR NEW.priority IS DISTINCT FROM OLD.priority
     OR NEW.ai_confidence IS DISTINCT FROM OLD.ai_confidence
     OR NEW.ai_recommendation IS DISTINCT FROM OLD.ai_recommendation
     OR NEW.arbitration_fee IS DISTINCT FROM OLD.arbitration_fee
     OR NEW.arbitrator_id IS DISTINCT FROM OLD.arbitrator_id
     OR NEW.arbitration_ruling IS DISTINCT FROM OLD.arbitration_ruling
     OR NEW.override_deadline IS DISTINCT FROM OLD.override_deadline
     OR NEW.override_reason IS DISTINCT FROM OLD.override_reason
     OR NEW.overridden_by IS DISTINCT FROM OLD.overridden_by
     OR NEW.overridden_at IS DISTINCT FROM OLD.overridden_at
     OR NEW.original_resolution IS DISTINCT FROM OLD.original_resolution
     OR NEW.buyer_id IS DISTINCT FROM OLD.buyer_id
     OR NEW.vendor_id IS DISTINCT FROM OLD.vendor_id
     OR NEW.transaction_id IS DISTINCT FROM OLD.transaction_id
     OR NEW.amount IS DISTINCT FROM OLD.amount
  THEN
    RAISE EXCEPTION 'Only administrators may change dispute outcome, arbitration, or system fields';
  END IF;
  IF NEW.ruling_accepted_buyer IS DISTINCT FROM OLD.ruling_accepted_buyer
     AND auth.uid() <> OLD.buyer_id THEN
    RAISE EXCEPTION 'Only the buyer may accept on their behalf';
  END IF;
  IF NEW.ruling_accepted_vendor IS DISTINCT FROM OLD.ruling_accepted_vendor
     AND auth.uid() <> OLD.vendor_id THEN
    RAISE EXCEPTION 'Only the vendor may accept on their behalf';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_enforce_dispute_update_scope ON public.disputes;
CREATE TRIGGER trg_enforce_dispute_update_scope
BEFORE UPDATE ON public.disputes
FOR EACH ROW EXECUTE FUNCTION public.enforce_dispute_update_scope();

-- 3) Column-level revokes for sensitive fields
REVOKE SELECT (webhook_secret) ON public.platform_widget_configs FROM authenticated, anon;
REVOKE SELECT (api_key_hash)   ON public.platform_api_keys        FROM authenticated, anon;
REVOKE SELECT (shipping_api_key_encrypted) ON public.vendor_settings FROM authenticated, anon;
REVOKE SELECT (token)          ON public.seed_tokens               FROM authenticated, anon;
REVOKE SELECT (token_value)    ON public.seed_token_audit_logs     FROM authenticated, anon;
REVOKE SELECT (buyer_email, buyer_phone) ON public.milestone_counter_proposals FROM anon;
REVOKE SELECT (buyer_email, buyer_phone_1, buyer_phone_2, buyer_phone_3) ON public.rfq_requests FROM anon;
REVOKE SELECT (buyer_email)    ON public.checkout_sessions         FROM anon;

-- 4) vendor_sites: anon may only see display-safe columns
REVOKE SELECT ON public.vendor_sites FROM anon;
GRANT SELECT (id, vendor_id, name, url, platform, industry, created_at) ON public.vendor_sites TO anon;

-- 5) Realtime channel authorization
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can subscribe to authorized topics" ON realtime.messages;
CREATE POLICY "Authenticated users can subscribe to authorized topics"
ON realtime.messages
FOR SELECT TO authenticated
USING (
  realtime.topic() LIKE '%' || auth.uid()::text || '%'
  OR EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE realtime.topic() LIKE '%' || t.id::text || '%'
      AND (t.buyer_id = auth.uid() OR t.vendor_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.user_id = auth.uid()
      AND realtime.topic() LIKE '%' || tm.workspace_id::text || '%'
  )
  OR EXISTS (
    SELECT 1 FROM public.message_threads mt
    WHERE realtime.topic() LIKE '%' || mt.id::text || '%'
      AND (mt.participant_1 = auth.uid() OR mt.participant_2 = auth.uid())
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);
