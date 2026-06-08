
-- ─────────────────────────────────────────────────────────────
-- 1. Forward-only state machine guard
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enforce_transaction_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _rank_old int;
  _rank_new int;
  _hold_states text[]  := ARRAY['kyc_hold','compliance_hold','compliance_review'];
  _terminal    text[]  := ARRAY['disputed','refunded','cancelled','released','split_resolved','completed'];
BEGIN
  IF NEW.status IS NULL OR OLD.status IS NULL OR NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- Exiting a hold state back to operational flow is always allowed
  IF OLD.status = ANY(_hold_states) THEN
    RETURN NEW;
  END IF;

  -- Entering a hold state or any terminal state is always allowed
  IF NEW.status = ANY(_hold_states) OR NEW.status = ANY(_terminal) THEN
    RETURN NEW;
  END IF;

  _rank_old := CASE OLD.status
    WHEN 'pending'   THEN 1
    WHEN 'locked'    THEN 2
    WHEN 'shipped'   THEN 3
    WHEN 'delivered' THEN 4
    ELSE 0
  END;
  _rank_new := CASE NEW.status
    WHEN 'pending'   THEN 1
    WHEN 'locked'    THEN 2
    WHEN 'shipped'   THEN 3
    WHEN 'delivered' THEN 4
    ELSE 0
  END;

  IF _rank_new > 0 AND _rank_old > 0 AND _rank_new < _rank_old THEN
    RAISE EXCEPTION
      'Illegal backwards status transition on transaction %: % → % (workflow state cannot regress)',
      NEW.id, OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_transaction_status_transition_trg ON public.transactions;
CREATE TRIGGER enforce_transaction_status_transition_trg
BEFORE UPDATE OF status ON public.transactions
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.enforce_transaction_status_transition();

-- ─────────────────────────────────────────────────────────────
-- 2. Status-change audit trail
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transaction_status_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  old_status      text,
  new_status      text NOT NULL,
  changed_by      uuid,
  source          text,
  changed_at      timestamptz NOT NULL DEFAULT now(),
  metadata        jsonb
);

CREATE INDEX IF NOT EXISTS idx_tx_status_history_tx
  ON public.transaction_status_history(transaction_id, changed_at DESC);

GRANT SELECT ON public.transaction_status_history TO authenticated;
GRANT ALL    ON public.transaction_status_history TO service_role;

ALTER TABLE public.transaction_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parties and admins view tx status history"
  ON public.transaction_status_history;
CREATE POLICY "Parties and admins view tx status history"
ON public.transaction_status_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = transaction_status_history.transaction_id
      AND (
        t.buyer_id  = auth.uid()
        OR t.vendor_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
  )
);

CREATE OR REPLACE FUNCTION public.log_transaction_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _src text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    BEGIN
      _src := current_setting('app.source', true);
    EXCEPTION WHEN OTHERS THEN
      _src := NULL;
    END;

    INSERT INTO public.transaction_status_history (
      transaction_id, old_status, new_status, changed_by, source
    ) VALUES (
      NEW.id, OLD.status, NEW.status, auth.uid(), _src
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_transaction_status_change_trg ON public.transactions;
CREATE TRIGGER log_transaction_status_change_trg
AFTER UPDATE OF status ON public.transactions
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.log_transaction_status_change();
