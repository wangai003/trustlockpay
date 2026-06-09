
-- 1. platform_api_keys.api_key_hash — service_role only
REVOKE SELECT (api_key_hash) ON public.platform_api_keys FROM authenticated, anon;

-- 2. seed_tokens.token and seed_token_audit_logs.token_value — service_role only
REVOKE SELECT (token) ON public.seed_tokens FROM authenticated, anon;
REVOKE SELECT (token_value) ON public.seed_token_audit_logs FROM authenticated, anon;

-- 3. vendor_settings.shipping_api_key_encrypted — service_role only
REVOKE SELECT (shipping_api_key_encrypted) ON public.vendor_settings FROM authenticated, anon;

-- 4. disputes UPDATE policy — restrict party updates to narrative-only fields
DROP POLICY IF EXISTS "Parties update own dispute narrative" ON public.disputes;

CREATE POLICY "Admins can update any dispute"
ON public.disputes FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Parties update own dispute narrative"
ON public.disputes FOR UPDATE
TO authenticated
USING (
  (buyer_id = auth.uid() OR vendor_id = auth.uid())
  AND NOT public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  (buyer_id = auth.uid() OR vendor_id = auth.uid())
  AND NOT public.has_role(auth.uid(), 'admin')
);

-- Tighten BEFORE UPDATE trigger: parties cannot modify outcome/admin fields
CREATE OR REPLACE FUNCTION public.enforce_dispute_update_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins bypass column restrictions
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- For buyer/vendor updates, block changes to admin/arbitration/outcome fields
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.resolution IS DISTINCT FROM OLD.resolution
     OR NEW.arbitration_ruling IS DISTINCT FROM OLD.arbitration_ruling
     OR NEW.arbitrator_id IS DISTINCT FROM OLD.arbitrator_id
     OR NEW.overridden_by IS DISTINCT FROM OLD.overridden_by
     OR NEW.ai_recommendation IS DISTINCT FROM OLD.ai_recommendation
     OR NEW.buyer_id IS DISTINCT FROM OLD.buyer_id
     OR NEW.vendor_id IS DISTINCT FROM OLD.vendor_id
     OR NEW.transaction_id IS DISTINCT FROM OLD.transaction_id
  THEN
    RAISE EXCEPTION 'Only admins may modify dispute outcome or arbitration fields';
  END IF;

  RETURN NEW;
END;
$$;

-- 5. arbitrator_proposals — counterparty SELECT
CREATE POLICY "Counterparty can view proposals on their disputes"
ON public.arbitrator_proposals FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.disputes d
    WHERE d.id = arbitrator_proposals.dispute_id
      AND (d.buyer_id = auth.uid() OR d.vendor_id = auth.uid())
  )
);

-- 6. rfq_requests — vendor SELECT
CREATE POLICY "Vendors can view RFQs directed to them"
ON public.rfq_requests FOR SELECT
TO authenticated
USING (vendor_id = auth.uid());

-- 7. lender_exposure — admin SELECT
CREATE POLICY "Admins can view all lender exposure"
ON public.lender_exposure FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
