
-- ═══════════════════════════════════════════════════════════════════
-- TRANSACTION STATUS STATE-MACHINE GUARD
-- Prevents invalid status transitions at the database level.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Allowed transition map (source_status => array of valid next statuses)
CREATE OR REPLACE FUNCTION public.is_valid_status_transition(
  _from text,
  _to text,
  _is_service_role boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  -- Same status (no-op update) always allowed
  IF _from IS NOT DISTINCT FROM _to THEN
    RETURN true;
  END IF;

  -- NULL from = INSERT; allow common initial statuses
  IF _from IS NULL THEN
    RETURN _to IN ('pending', 'locked', 'draft', 'negotiating', 'awaiting_payment');
  END IF;

  -- Compliance / KYC holds: only service_role (system triggers) can set these
  IF _to IN ('compliance_hold', 'compliance_review', 'kyc_hold') THEN
    RETURN _is_service_role;
  END IF;

  -- Coming OUT of a compliance/kyc hold also requires service_role
  IF _from IN ('compliance_hold', 'compliance_review', 'kyc_hold') THEN
    RETURN _is_service_role;
  END IF;

  -- Terminal states cannot transition further (except by service_role for corrections)
  IF _from IN ('released', 'refunded', 'cancelled', 'completed') THEN
    RETURN _is_service_role;
  END IF;

  -- Forward-only state machine
  RETURN CASE _from
    WHEN 'draft'            THEN _to IN ('negotiating', 'pending', 'cancelled')
    WHEN 'negotiating'      THEN _to IN ('pending', 'awaiting_payment', 'locked', 'cancelled')
    WHEN 'awaiting_payment' THEN _to IN ('locked', 'cancelled', 'pending')
    WHEN 'pending'          THEN _to IN ('locked', 'cancelled', 'awaiting_payment')
    WHEN 'locked'           THEN _to IN ('shipped', 'delivered', 'disputed', 'cancelled', 'refunded')
    WHEN 'shipped'          THEN _to IN ('delivered', 'disputed', 'cancelled', 'refunded')
    WHEN 'delivered'        THEN _to IN ('released', 'disputed', 'refunded', 'completed')
    WHEN 'disputed'         THEN _to IN ('released', 'refunded', 'cancelled', 'delivered')
    ELSE false
  END;
END;
$$;

-- 2. Trigger that enforces the state machine on every UPDATE
CREATE OR REPLACE FUNCTION public.enforce_transaction_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _is_service boolean;
BEGIN
  -- Only validate when status actually changes
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Detect if write is coming from service_role (edge fns, system triggers)
  _is_service := (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
                 OR current_user = 'service_role'
                 OR current_user = 'postgres'
                 OR current_user = 'supabase_admin';

  IF NOT public.is_valid_status_transition(
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
    NEW.status,
    _is_service
  ) THEN
    RAISE EXCEPTION
      'Invalid transaction status transition: % → % (tx: %). This transition is not allowed by the state machine.',
      COALESCE(OLD.status, '(new)'), NEW.status, COALESCE(NEW.tx_id, NEW.id::text)
      USING ERRCODE = 'check_violation',
            HINT = 'Use public.update_transaction_status() or follow the allowed state machine. Compliance/KYC statuses are system-only.';
  END IF;

  -- Auto-log the transition for the 7-year audit trail
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.transaction_status_history (
      transaction_id, from_status, to_status, changed_at, changed_by
    ) VALUES (
      NEW.id, OLD.status, NEW.status, now(), auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_status_transition ON public.transactions;
CREATE TRIGGER enforce_status_transition
  BEFORE INSERT OR UPDATE OF status ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_transaction_status_transition();

-- 3. Single safe RPC chokepoint that app code should use
CREATE OR REPLACE FUNCTION public.update_transaction_status(
  _transaction_id uuid,
  _new_status text,
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER  -- runs as the caller so RLS + trigger guard both apply
SET search_path = public
AS $$
DECLARE
  _old_status text;
  _tx_id text;
BEGIN
  SELECT status, tx_id INTO _old_status, _tx_id
  FROM public.transactions
  WHERE id = _transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction % not found', _transaction_id
      USING ERRCODE = 'no_data_found';
  END IF;

  UPDATE public.transactions
  SET status = _new_status, updated_at = now()
  WHERE id = _transaction_id;

  RETURN jsonb_build_object(
    'ok', true,
    'transaction_id', _transaction_id,
    'tx_id', _tx_id,
    'from_status', _old_status,
    'to_status', _new_status,
    'reason', _reason,
    'changed_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_transaction_status(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_transaction_status(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_valid_status_transition(text, text, boolean) TO authenticated, service_role;
