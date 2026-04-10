
-- 1. Add role columns to message_threads for 4-way mesh discovery
ALTER TABLE public.message_threads
  ADD COLUMN IF NOT EXISTS participant_1_role text,
  ADD COLUMN IF NOT EXISTS participant_2_role text;

-- 2. Index for role-based lookups
CREATE INDEX IF NOT EXISTS idx_message_threads_p1_role ON public.message_threads (participant_1_role);
CREATE INDEX IF NOT EXISTS idx_message_threads_p2_role ON public.message_threads (participant_2_role);

-- 3. Full lender notification trigger on transactions
CREATE OR REPLACE FUNCTION public.notify_lender_on_transaction_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _lender_id uuid;
  _tx_label text;
  _title text;
  _message text;
  _type text;
BEGIN
  -- Only fire on status changes
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  _tx_label := COALESCE(NEW.tx_id, NEW.id::text);

  -- Find linked lender via financing_applications
  SELECT fa.lender_id INTO _lender_id
  FROM financing_applications fa
  WHERE fa.vendor_id = NEW.vendor_id
    AND fa.status IN ('approved', 'active')
  ORDER BY fa.updated_at DESC
  LIMIT 1;

  -- No linked lender → skip
  IF _lender_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine notification based on new status
  CASE NEW.status
    WHEN 'cancelled' THEN
      _title := '🚫 Order Cancelled — ' || _tx_label;
      _message := 'Vendor ' || COALESCE(NEW.vendor_name, 'Unknown') || ' cancelled order ' || _tx_label || ' ($' || NEW.amount::text || '). Review repayment impact.';
      _type := 'warning';

    WHEN 'shipped' THEN
      _title := '📦 Order Shipped — ' || _tx_label;
      _message := 'Order ' || _tx_label || ' ($' || NEW.amount::text || ') has been shipped by ' || COALESCE(NEW.vendor_name, 'Unknown') || '.';
      _type := 'info';

    WHEN 'delivered' THEN
      _title := '✅ Order Delivered — ' || _tx_label;
      _message := 'Order ' || _tx_label || ' ($' || NEW.amount::text || ') confirmed delivered. Escrow release window active.';
      _type := 'info';

    WHEN 'released' THEN
      _title := '💰 Escrow Released — ' || _tx_label;
      _message := 'Funds for order ' || _tx_label || ' ($' || NEW.amount::text || ') released to ' || COALESCE(NEW.vendor_name, 'Unknown') || '. Repayment trigger activated.';
      _type := 'success';

    WHEN 'disputed' THEN
      _title := '⚠️ Dispute Opened — ' || _tx_label;
      _message := 'A dispute has been opened on order ' || _tx_label || ' ($' || NEW.amount::text || '). Funds remain in escrow pending resolution.';
      _type := 'warning';

    WHEN 'kyc_hold' THEN
      _title := '🔒 KYC Hold — ' || _tx_label;
      _message := 'Order ' || _tx_label || ' ($' || NEW.amount::text || ') placed on KYC hold. Transaction paused pending verification.';
      _type := 'warning';

    WHEN 'compliance_hold' THEN
      _title := '🛑 Compliance Hold — ' || _tx_label;
      _message := 'Order ' || _tx_label || ' ($' || NEW.amount::text || ') frozen due to compliance flag. Lender exposure may be affected.';
      _type := 'warning';

    WHEN 'compliance_review' THEN
      _title := '🔍 Compliance Review — ' || _tx_label;
      _message := 'Order ' || _tx_label || ' ($' || NEW.amount::text || ') under compliance review.';
      _type := 'info';

    WHEN 'refunded' THEN
      _title := '↩️ Order Refunded — ' || _tx_label;
      _message := 'Order ' || _tx_label || ' ($' || NEW.amount::text || ') has been refunded. Review financing exposure.';
      _type := 'warning';

    ELSE
      RETURN NEW; -- No notification for other statuses
  END CASE;

  INSERT INTO public.notifications (user_id, title, message, type, related_entity_type, related_entity_id)
  VALUES (_lender_id, _title, _message, _type, 'transaction', NEW.id::text);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_lender_on_tx_event
  AFTER UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_lender_on_transaction_event();

-- 4. Lender notification on milestone releases
CREATE OR REPLACE FUNCTION public.notify_lender_on_milestone_release()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _lender_id uuid;
  _tx record;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'released' AND OLD.status IS DISTINCT FROM 'released' THEN
    -- Get parent transaction
    SELECT * INTO _tx FROM transactions WHERE id = NEW.transaction_id;
    IF _tx IS NULL THEN RETURN NEW; END IF;

    SELECT fa.lender_id INTO _lender_id
    FROM financing_applications fa
    WHERE fa.vendor_id = _tx.vendor_id AND fa.status IN ('approved', 'active')
    ORDER BY fa.updated_at DESC LIMIT 1;

    IF _lender_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, related_entity_type, related_entity_id)
      VALUES (
        _lender_id,
        '💰 Milestone Released — ' || COALESCE(NEW.title, 'Milestone'),
        'Milestone "' || COALESCE(NEW.title, '#' || NEW.milestone_index::text) || '" ($' || COALESCE(NEW.amount, 0)::text || ') released on order ' || COALESCE(_tx.tx_id, _tx.id::text) || '. Partial repayment may apply.',
        'info',
        'milestone',
        NEW.id::text
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_lender_on_milestone_release
  AFTER UPDATE ON public.transaction_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_lender_on_milestone_release();
