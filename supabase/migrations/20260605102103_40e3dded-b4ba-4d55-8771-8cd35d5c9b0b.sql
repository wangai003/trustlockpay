
-- Auto-route to escrow when a crypto checkout becomes confirmed.
-- Mirrors the pattern used by auto_scan_uploaded_document: uses pg_net + vault.

CREATE OR REPLACE FUNCTION public.auto_route_inbound_on_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  _supabase_url text;
  _service_key text;
  _tx record;
  _is_crypto boolean;
  _should_fire boolean := false;
  _retry_old text;
  _retry_new text;
BEGIN
  -- Only act on confirmed sessions linked to a transaction
  IF NEW.status IS DISTINCT FROM 'confirmed' OR NEW.transaction_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Crypto only (route_inbound covers crypto/direct path)
  _is_crypto := COALESCE(NEW.payment_method, '') ILIKE 'crypto%'
              OR COALESCE(NEW.payment_method, '') = 'direct';
  IF NOT _is_crypto THEN
    RETURN NEW;
  END IF;

  -- Fire on first confirmation OR on explicit retry bump
  IF TG_OP = 'INSERT' THEN
    _should_fire := true;
  ELSE
    IF OLD.status IS DISTINCT FROM 'confirmed' AND NEW.status = 'confirmed' THEN
      _should_fire := true;
    END IF;
    _retry_old := OLD.session_data->>'routing_retry_at';
    _retry_new := NEW.session_data->>'routing_retry_at';
    IF _retry_new IS NOT NULL AND _retry_new IS DISTINCT FROM _retry_old THEN
      _should_fire := true;
    END IF;
  END IF;

  IF NOT _should_fire THEN
    RETURN NEW;
  END IF;

  -- Only fire when the transaction hasn't already settled / been routed
  SELECT id, status, settlement_completed_at, amount
    INTO _tx
    FROM public.transactions
   WHERE id = NEW.transaction_id;

  IF _tx.id IS NULL THEN
    RETURN NEW;
  END IF;

  IF _tx.settlement_completed_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF _tx.status NOT IN ('locked', 'pending', 'shipped', 'delivered') THEN
    RETURN NEW;
  END IF;

  -- Resolve service-role credentials from vault (same pattern as auto_scan_uploaded_document)
  SELECT decrypted_secret INTO _supabase_url FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1;
  SELECT decrypted_secret INTO _service_key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;

  IF _supabase_url IS NULL OR _service_key IS NULL THEN
    RAISE WARNING 'auto_route_inbound_on_confirmed: missing vault secrets, skipping for session %', NEW.id;
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := _supabase_url || '/functions/v1/wallet-routing-bridge',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _service_key
    ),
    body := jsonb_build_object(
      'action', 'route_inbound',
      'transactionId', NEW.transaction_id,
      'processor', 'direct',
      'paymentMethod', COALESCE(NEW.payment_method, 'crypto'),
      'verifiedAmount', COALESCE(_tx.amount, NEW.amount),
      'network', COALESCE(NEW.payment_proof->>'network', 'polygon'),
      'isTestnet', false,
      'source', 'auto_route_inbound_on_confirmed'
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the underlying checkout write
  RAISE WARNING 'auto_route_inbound_on_confirmed failed for session %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_route_inbound_on_confirmed ON public.checkout_sessions;
CREATE TRIGGER trg_auto_route_inbound_on_confirmed
AFTER INSERT OR UPDATE ON public.checkout_sessions
FOR EACH ROW
EXECUTE FUNCTION public.auto_route_inbound_on_confirmed();
