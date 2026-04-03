
-- Enable pg_net for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function that fires the document-scanner edge function
CREATE OR REPLACE FUNCTION public.auto_scan_uploaded_document()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  _supabase_url text;
  _service_key text;
  _payload jsonb;
  _file_url text;
  _doc_ref text;
  _source text;
  _user_id uuid;
  _transaction_id uuid;
BEGIN
  -- Get config from vault/env
  _supabase_url := current_setting('app.settings.supabase_url', true);
  _service_key := current_setting('app.settings.service_role_key', true);

  -- If settings not available, try secrets
  IF _supabase_url IS NULL THEN
    SELECT decrypted_secret INTO _supabase_url FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1;
  END IF;
  IF _service_key IS NULL THEN
    SELECT decrypted_secret INTO _service_key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;
  END IF;

  -- Skip if we can't reach the function
  IF _supabase_url IS NULL OR _service_key IS NULL THEN
    RAISE WARNING 'auto_scan: missing SUPABASE_URL or SERVICE_ROLE_KEY, skipping scan';
    RETURN NEW;
  END IF;

  -- Determine source table and extract fields
  IF TG_TABLE_NAME = 'kyc_documents' THEN
    _file_url := NEW.file_url;
    _doc_ref := 'kyc-' || NEW.id::text;
    _source := 'kyc_documents';
    _user_id := NEW.vendor_id;
    _transaction_id := NULL;
  ELSIF TG_TABLE_NAME = 'dispute_evidence' THEN
    _file_url := NEW.file_url;
    _doc_ref := 'dispute-' || NEW.id::text;
    _source := 'dispute_evidence';
    _user_id := NEW.uploaded_by;
    -- Get transaction_id from the dispute
    SELECT transaction_id INTO _transaction_id FROM disputes WHERE id = NEW.dispute_id LIMIT 1;
  ELSE
    RETURN NEW;
  END IF;

  -- Skip if no file URL
  IF _file_url IS NULL OR _file_url = '' THEN
    RETURN NEW;
  END IF;

  _payload := jsonb_build_object(
    'action', 'scan_single',
    'file_url', _file_url,
    'document_ref', _doc_ref,
    'document_source', _source,
    'user_id', _user_id,
    'transaction_id', _transaction_id
  );

  -- Fire async HTTP POST to document-scanner
  PERFORM net.http_post(
    url := _supabase_url || '/functions/v1/document-scanner',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _service_key
    ),
    body := _payload
  );

  RETURN NEW;
END;
$$;

-- Trigger on kyc_documents
CREATE TRIGGER trg_auto_scan_kyc
  AFTER INSERT ON public.kyc_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_scan_uploaded_document();

-- Trigger on dispute_evidence
CREATE TRIGGER trg_auto_scan_dispute_evidence
  AFTER INSERT ON public.dispute_evidence
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_scan_uploaded_document();
