
-- Extend the auto-scan function to handle acknowledgement_forms
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
  _supabase_url := current_setting('app.settings.supabase_url', true);
  _service_key := current_setting('app.settings.service_role_key', true);

  IF _supabase_url IS NULL THEN
    SELECT decrypted_secret INTO _supabase_url FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1;
  END IF;
  IF _service_key IS NULL THEN
    SELECT decrypted_secret INTO _service_key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;
  END IF;

  IF _supabase_url IS NULL OR _service_key IS NULL THEN
    RAISE WARNING 'auto_scan: missing SUPABASE_URL or SERVICE_ROLE_KEY, skipping scan';
    RETURN NEW;
  END IF;

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
    SELECT transaction_id INTO _transaction_id FROM disputes WHERE id = NEW.dispute_id LIMIT 1;
  ELSIF TG_TABLE_NAME = 'acknowledgement_forms' THEN
    _file_url := NEW.pdf_url;
    _doc_ref := 'milestone-' || COALESCE(NEW.milestone_id::text, NEW.id::text);
    _source := 'milestone_documents';
    _user_id := NULL;
    _transaction_id := NEW.transaction_id;
  ELSE
    RETURN NEW;
  END IF;

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

-- Trigger on acknowledgement_forms for milestone documents
CREATE TRIGGER trg_auto_scan_milestone_docs
  AFTER INSERT ON public.acknowledgement_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_scan_uploaded_document();
