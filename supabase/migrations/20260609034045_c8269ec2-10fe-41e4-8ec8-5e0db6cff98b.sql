
-- ═══════════════════════════════════════════════════════════
-- ROUTING RETRY QUEUE
-- Captures failed wallet-routing-bridge calls for auto-retry
-- ═══════════════════════════════════════════════════════════

CREATE TABLE public.routing_retry_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid,
  milestone_id uuid,
  surface text NOT NULL CHECK (surface IN ('trustlock_os_pay','trustlock_os_payout','admin_os_pay')),
  action text NOT NULL CHECK (action IN (
    'route_inbound','route_release','route_split','route_refund',
    'route_milestone','route_refund_milestone','route_vendor_payout'
  )),
  recipient_user_id uuid,
  recipient_role text,
  recipient_address text,
  recipient_chain text,
  recipient_method text,
  amount_principal numeric NOT NULL DEFAULT 0,
  amount_fee_already_taken numeric NOT NULL DEFAULT 0,
  fee_phase text NOT NULL DEFAULT 'none' CHECK (fee_phase IN ('upfront_taken','escrow_fee_taken','none')),
  original_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  failure_reason text,
  failure_code text,
  failure_details jsonb DEFAULT '{}'::jsonb,
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 10,
  next_retry_at timestamptz NOT NULL DEFAULT now(),
  last_attempted_at timestamptz,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','awaiting_update','retrying','completed','abandoned','manual_required')),
  unblocked_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX idx_routing_retry_status_next ON public.routing_retry_queue (status, next_retry_at);
CREATE INDEX idx_routing_retry_recipient ON public.routing_retry_queue (recipient_user_id, status);
CREATE INDEX idx_routing_retry_tx ON public.routing_retry_queue (transaction_id);

GRANT SELECT ON public.routing_retry_queue TO authenticated;
GRANT ALL ON public.routing_retry_queue TO service_role;

ALTER TABLE public.routing_retry_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own queued routing rows"
  ON public.routing_retry_queue FOR SELECT
  TO authenticated
  USING (recipient_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_routing_retry_touch
  BEFORE UPDATE ON public.routing_retry_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── Instant-retry triggers (event-driven unblock) ─────────
CREATE OR REPLACE FUNCTION public.unblock_routing_on_wallet_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.routing_retry_queue
     SET next_retry_at = now(),
         status = 'queued',
         unblocked_by = 'wallet_added'
   WHERE recipient_user_id = NEW.user_id
     AND status IN ('awaiting_update','queued','manual_required')
     AND (
       failure_code IN ('missing_wallet','unverified_wallet','wallet_mismatch','no_default_wallet')
       OR failure_reason ILIKE '%wallet%'
     );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_saved_payout_wallets_unblock
  AFTER INSERT OR UPDATE ON public.saved_payout_wallets
  FOR EACH ROW EXECUTE FUNCTION public.unblock_routing_on_wallet_change();

CREATE OR REPLACE FUNCTION public.unblock_routing_on_kyc_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    UPDATE public.routing_retry_queue
       SET next_retry_at = now(),
           status = 'queued',
           unblocked_by = 'kyc_cleared'
     WHERE recipient_user_id = NEW.vendor_id
       AND status IN ('awaiting_update','manual_required')
       AND (failure_code = 'kyc_hold' OR failure_reason ILIKE '%kyc%');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_kyc_queue_unblock
  AFTER UPDATE ON public.kyc_queue
  FOR EACH ROW EXECUTE FUNCTION public.unblock_routing_on_kyc_approved();
