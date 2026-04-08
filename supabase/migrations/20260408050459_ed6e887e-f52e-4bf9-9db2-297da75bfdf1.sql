
-- 1. INCOTERMS: Add incoterm to transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS incoterm text DEFAULT NULL;

-- 2. MULTI-CURRENCY: Add base currency and normalization fields
ALTER TABLE public.external_fee_entries ADD COLUMN IF NOT EXISTS base_currency text DEFAULT NULL;
ALTER TABLE public.external_fee_entries ADD COLUMN IF NOT EXISTS exchange_rate_snapshot numeric DEFAULT NULL;
ALTER TABLE public.external_fee_entries ADD COLUMN IF NOT EXISTS normalized_amount numeric DEFAULT NULL;

-- 3. TEMPORAL CLASSIFICATION: Add fee phase
ALTER TABLE public.external_fee_entries ADD COLUMN IF NOT EXISTS fee_phase text DEFAULT 'pre_shipment'
  CONSTRAINT valid_fee_phase CHECK (fee_phase IN ('pre_escrow', 'pre_shipment', 'in_transit', 'post_arrival'));

-- 4. PRE-ESCROW: Add pre-escrow flag
ALTER TABLE public.external_fee_entries ADD COLUMN IF NOT EXISTS is_pre_escrow boolean DEFAULT false;

-- 5. FEE DISPUTE RESOLUTION: Add dispute lifecycle columns
ALTER TABLE public.external_fee_entries ADD COLUMN IF NOT EXISTS dispute_status text DEFAULT 'none'
  CONSTRAINT valid_dispute_status CHECK (dispute_status IN ('none', 'disputed', 'revised', 'withdrawn'));
ALTER TABLE public.external_fee_entries ADD COLUMN IF NOT EXISTS dispute_note text DEFAULT NULL;
ALTER TABLE public.external_fee_entries ADD COLUMN IF NOT EXISTS disputed_at timestamptz DEFAULT NULL;

-- 6. ADMIN ESCALATION: Trigger when external fees exceed 30% of escrow value
CREATE OR REPLACE FUNCTION public.check_external_fee_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _total_fees numeric;
  _escrow_amount numeric;
  _tx_id_text text;
  _ratio numeric;
  _existing_alert boolean;
BEGIN
  -- Sum all external fees for this transaction
  SELECT COALESCE(SUM(amount), 0) INTO _total_fees
  FROM external_fee_entries
  WHERE transaction_id = NEW.transaction_id;

  -- Get escrow amount
  SELECT amount, tx_id INTO _escrow_amount, _tx_id_text
  FROM transactions
  WHERE id = NEW.transaction_id;

  IF _escrow_amount IS NULL OR _escrow_amount <= 0 THEN
    RETURN NEW;
  END IF;

  _ratio := _total_fees / _escrow_amount;

  -- Only escalate if ratio exceeds 30%
  IF _ratio < 0.30 THEN
    RETURN NEW;
  END IF;

  -- Check if alert already exists for this transaction
  SELECT EXISTS(
    SELECT 1 FROM admin_cross_department_alerts
    WHERE related_entity_id = NEW.transaction_id::text
      AND alert_type = 'high_external_fee_ratio'
      AND status != 'completed'
  ) INTO _existing_alert;

  IF _existing_alert THEN
    RETURN NEW;
  END IF;

  -- Route alert to Finance and Compliance
  PERFORM public.route_department_alert(
    'operations',
    'finance',
    'high_external_fee_ratio',
    '⚠️ High External Fee Ratio — ' || COALESCE(_tx_id_text, NEW.transaction_id::text),
    'External fees total $' || _total_fees::text || ' (' || round(_ratio * 100, 1)::text || '% of $' || _escrow_amount::text || ' escrow). Review for compliance.',
    'high',
    'transaction',
    NEW.transaction_id::text
  );

  PERFORM public.route_department_alert(
    'operations',
    'compliance',
    'high_external_fee_ratio',
    '⚠️ High External Fee Ratio — ' || COALESCE(_tx_id_text, NEW.transaction_id::text),
    'External fees total $' || _total_fees::text || ' (' || round(_ratio * 100, 1)::text || '% of $' || _escrow_amount::text || ' escrow). Verify legitimacy.',
    'high',
    'transaction',
    NEW.transaction_id::text
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_external_fee_escalation
AFTER INSERT OR UPDATE ON public.external_fee_entries
FOR EACH ROW
EXECUTE FUNCTION public.check_external_fee_escalation();
