
CREATE OR REPLACE FUNCTION public.get_contract_audit_trail(_transaction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _result jsonb;
  _contract jsonb;
  _consent jsonb;
  _ack_forms jsonb;
  _carbon_copies jsonb;
BEGIN
  SELECT to_jsonb(c.*) INTO _contract
  FROM pre_order_contracts c
  WHERE c.transaction_id = _transaction_id
  LIMIT 1;

  IF _contract IS NOT NULL AND (_contract->>'is_vendor_auto_signed')::boolean = true THEN
    SELECT to_jsonb(vc.*) INTO _consent
    FROM vendor_consent_records vc
    WHERE vc.vendor_id = (_contract->>'vendor_id')::uuid
      AND vc.consent_type = 'auto_signature'
      AND vc.is_active = true
    ORDER BY vc.created_at DESC
    LIMIT 1;
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(af.*) ORDER BY af.created_at), '[]'::jsonb)
  INTO _ack_forms
  FROM acknowledgement_forms af
  WHERE af.transaction_id = _transaction_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(occ.*) ORDER BY occ.created_at), '[]'::jsonb)
  INTO _carbon_copies
  FROM order_carbon_copies occ
  WHERE occ.transaction_id = _transaction_id;

  _result := jsonb_build_object(
    'contract', COALESCE(_contract, 'null'::jsonb),
    'consent_record', COALESCE(_consent, 'null'::jsonb),
    'acknowledgement_forms', _ack_forms,
    'order_carbon_copies', _carbon_copies
  );

  RETURN _result;
END;
$$;
