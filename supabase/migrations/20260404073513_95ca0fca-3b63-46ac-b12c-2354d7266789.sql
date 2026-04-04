
-- Trigger function: post-escrow KYC enforcement
CREATE OR REPLACE FUNCTION public.enforce_post_escrow_kyc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _has_kyc boolean := false;
  _threshold numeric := 5000;
  _admin_id uuid;
BEGIN
  -- Only act when status transitions to 'locked'
  IF NEW.status <> 'locked' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'locked' THEN
    RETURN NEW; -- already locked, no re-trigger
  END IF;

  -- Check if amount exceeds threshold
  IF COALESCE(NEW.amount, 0) <= _threshold THEN
    RETURN NEW; -- under threshold, no action
  END IF;

  -- Check if buyer has approved KYC
  SELECT EXISTS (
    SELECT 1 FROM public.kyc_queue
    WHERE vendor_id = NEW.buyer_id AND status = 'approved'
  ) INTO _has_kyc;

  -- Also check if buyer is a vendor with approved KYC
  IF NOT _has_kyc THEN
    SELECT EXISTS (
      SELECT 1 FROM public.kyc_queue
      WHERE vendor_id = NEW.vendor_id AND status = 'approved'
    ) INTO _has_kyc;
  END IF;

  -- If either party has no approved KYC, enforce hold
  IF _has_kyc THEN
    RETURN NEW; -- KYC already done, no hold
  END IF;

  -- Set transaction to kyc_hold
  NEW.status := 'kyc_hold';

  -- Notify buyer
  INSERT INTO public.notifications (user_id, title, message, type, is_action_required, action_url, related_entity_type, related_entity_id)
  VALUES (
    NEW.buyer_id,
    '🔒 Identity Verification Required',
    'Your escrow order ' || COALESCE(NEW.tx_id, NEW.id::text) || ' for $' || NEW.amount::text || ' requires identity verification before it can proceed. Please complete your KYC to unlock this transaction.',
    'warning',
    true,
    '/trustlock/buyer/orders',
    'transaction',
    NEW.id::text
  );

  -- Notify vendor
  IF NEW.vendor_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, related_entity_type, related_entity_id)
    VALUES (
      NEW.vendor_id,
      '⏳ Order Pending Buyer Verification',
      'Order ' || COALESCE(NEW.tx_id, NEW.id::text) || ' for $' || NEW.amount::text || ' is on hold pending buyer identity verification. You will be notified once it clears.',
      'info',
      'transaction',
      NEW.id::text
    );
  END IF;

  -- Notify all admins
  FOR _admin_id IN
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, is_action_required, action_url, related_entity_type, related_entity_id)
    VALUES (
      _admin_id,
      '🚨 High-Value Escrow — KYC Required',
      'Transaction ' || COALESCE(NEW.tx_id, NEW.id::text) || ' ($' || NEW.amount::text || ') entered escrow without approved KYC. Buyer: ' || COALESCE(NEW.buyer_name, 'Unknown') || '. Auto-held pending verification.',
      'warning',
      true,
      '/trustlock/admin/transactions',
      'transaction',
      NEW.id::text
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Attach trigger (BEFORE so we can modify NEW.status)
DROP TRIGGER IF EXISTS trg_enforce_post_escrow_kyc ON public.transactions;
CREATE TRIGGER trg_enforce_post_escrow_kyc
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_post_escrow_kyc();
