
CREATE OR REPLACE FUNCTION public.unblock_routing_on_wallet_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT id FROM public.routing_retry_queue
     WHERE recipient_user_id = NEW.user_id
       AND status IN ('awaiting_update','queued','manual_required')
       AND (
         failure_code IN ('missing_wallet','unverified_wallet','wallet_mismatch','no_default_wallet')
         OR failure_reason ILIKE '%wallet%'
       )
  LOOP
    UPDATE public.routing_retry_queue
       SET status = 'queued', unblocked_by = 'wallet_added', next_retry_at = now()
     WHERE id = r.id;
    PERFORM net.http_post(
      url := 'https://dbajucxswcgxllmwxnia.supabase.co/functions/v1/routing-retry-worker',
      headers := jsonb_build_object('Content-Type','application/json','apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiYWp1Y3hzd2NneGxsbXd4bmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNTk5MzUsImV4cCI6MjA4OTczNTkzNX0.wAQ2anmYxNGIcOni7qCLmjy6tv-4qg60HnkVDhNGBFk'),
      body := jsonb_build_object('action','retry_unblocked','retryId', r.id)
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.unblock_routing_on_kyc_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    FOR r IN
      SELECT id FROM public.routing_retry_queue
       WHERE recipient_user_id = NEW.vendor_id
         AND status IN ('awaiting_update','manual_required','queued')
         AND (failure_code = 'kyc_hold' OR failure_reason ILIKE '%kyc%')
    LOOP
      UPDATE public.routing_retry_queue
         SET status = 'queued', unblocked_by = 'kyc_cleared', next_retry_at = now()
       WHERE id = r.id;
      PERFORM net.http_post(
        url := 'https://dbajucxswcgxllmwxnia.supabase.co/functions/v1/routing-retry-worker',
        headers := jsonb_build_object('Content-Type','application/json','apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiYWp1Y3hzd2NneGxsbXd4bmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNTk5MzUsImV4cCI6MjA4OTczNTkzNX0.wAQ2anmYxNGIcOni7qCLmjy6tv-4qg60HnkVDhNGBFk'),
        body := jsonb_build_object('action','retry_unblocked','retryId', r.id)
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
