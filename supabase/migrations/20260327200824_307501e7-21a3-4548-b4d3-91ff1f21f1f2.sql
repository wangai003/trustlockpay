
-- Trigger function: auto-archive transaction documents on status changes
CREATE OR REPLACE FUNCTION public.auto_archive_transaction_documents()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _buyer_name text;
  _vendor_name text;
  _industry text;
  _tx_id text;
BEGIN
  -- Only fire on relevant status changes
  IF TG_OP = 'INSERT' AND NEW.status = 'locked' THEN
    -- no-op, fall through to locked handling
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- no-op, fall through
  ELSE
    RETURN NEW;
  END IF;

  _buyer_name := COALESCE(NEW.buyer_name, 'Unknown Buyer');
  _vendor_name := COALESCE(NEW.vendor_name, 'Unknown Vendor');
  _industry := NEW.industry;
  _tx_id := NEW.tx_id;

  -- STATUS: LOCKED (new escrow order)
  IF NEW.status = 'locked' THEN
    -- 1. Escrow Acknowledgement Form
    INSERT INTO public.protection_documents (document_type, title, transaction_id, user_id, role, industry, retention_years, metadata)
    VALUES (
      'escrow_acknowledgement',
      'Escrow Acknowledgement — ' || _tx_id,
      NEW.id,
      NEW.vendor_id,
      'vendor',
      _industry,
      7,
      jsonb_build_object(
        'auto_generated', true,
        'trigger', 'auto_archive_transaction_documents',
        'buyer_id', NEW.buyer_id,
        'vendor_id', NEW.vendor_id,
        'buyer_name', _buyer_name,
        'vendor_name', _vendor_name,
        'amount', NEW.amount,
        'tx_id', _tx_id
      )
    );

    -- 2. Pre-Order Signatory Contract
    INSERT INTO public.protection_documents (document_type, title, transaction_id, user_id, role, industry, retention_years, metadata)
    VALUES (
      'pre_order_contract',
      'Pre-Order Signatory Contract — ' || _tx_id,
      NEW.id,
      NEW.buyer_id,
      'buyer',
      _industry,
      7,
      jsonb_build_object(
        'auto_generated', true,
        'trigger', 'auto_archive_transaction_documents',
        'buyer_id', NEW.buyer_id,
        'vendor_id', NEW.vendor_id,
        'buyer_name', _buyer_name,
        'vendor_name', _vendor_name,
        'amount', NEW.amount,
        'tx_id', _tx_id
      )
    );

    -- 3. AML Screening Certificate (check compliance_flags)
    INSERT INTO public.protection_documents (document_type, title, transaction_id, user_id, role, industry, retention_years, metadata)
    VALUES (
      'aml_certificate',
      'AML Screening Certificate — ' || _tx_id,
      NEW.id,
      NEW.buyer_id,
      'admin',
      _industry,
      7,
      jsonb_build_object(
        'auto_generated', true,
        'trigger', 'auto_archive_transaction_documents',
        'buyer_id', NEW.buyer_id,
        'vendor_id', NEW.vendor_id,
        'buyer_name', _buyer_name,
        'vendor_name', _vendor_name,
        'amount', NEW.amount,
        'tx_id', _tx_id,
        'compliance_flags_exist', EXISTS(
          SELECT 1 FROM public.compliance_flags
          WHERE related_buyer_id = NEW.buyer_id OR related_vendor_id = NEW.vendor_id
        )
      )
    );

  -- STATUS: RELEASED
  ELSIF NEW.status = 'released' THEN
    INSERT INTO public.protection_documents (document_type, title, transaction_id, user_id, role, industry, retention_years, metadata)
    VALUES (
      'payout_reconciliation',
      'Payout Reconciliation Receipt — ' || _tx_id,
      NEW.id,
      NEW.vendor_id,
      'vendor',
      _industry,
      7,
      jsonb_build_object(
        'auto_generated', true,
        'trigger', 'auto_archive_transaction_documents',
        'buyer_id', NEW.buyer_id,
        'vendor_id', NEW.vendor_id,
        'buyer_name', _buyer_name,
        'vendor_name', _vendor_name,
        'amount', NEW.amount,
        'fee', COALESCE(NEW.fee, 0),
        'released_date', COALESCE(NEW.released_date, now()),
        'tx_id', _tx_id
      )
    );

  -- STATUS: DISPUTED
  ELSIF NEW.status = 'disputed' THEN
    INSERT INTO public.protection_documents (document_type, title, transaction_id, user_id, role, industry, retention_years, metadata)
    VALUES (
      'dispute_evidence_package',
      'Dispute Evidence Package — ' || _tx_id,
      NEW.id,
      NEW.buyer_id,
      'admin',
      _industry,
      7,
      jsonb_build_object(
        'auto_generated', true,
        'trigger', 'auto_archive_transaction_documents',
        'buyer_id', NEW.buyer_id,
        'vendor_id', NEW.vendor_id,
        'buyer_name', _buyer_name,
        'vendor_name', _vendor_name,
        'amount', NEW.amount,
        'tx_id', _tx_id,
        'status', 'placeholder_pending_evidence'
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger on transactions table
DROP TRIGGER IF EXISTS trg_auto_archive_transaction_documents ON public.transactions;
CREATE TRIGGER trg_auto_archive_transaction_documents
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_archive_transaction_documents();
