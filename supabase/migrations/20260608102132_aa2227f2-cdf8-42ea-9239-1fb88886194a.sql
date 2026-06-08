-- ═══════════════════════════════════════════════════════════
-- AUTONOMOUS FIXER + PRESET TROUBLESHOOTING SYSTEM
-- ═══════════════════════════════════════════════════════════

CREATE TABLE public.autonomous_fixer_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_type TEXT NOT NULL CHECK (ticket_type IN ('preset', 'autonomous_fixer')),
  preset_key TEXT,
  tx_id_input TEXT NOT NULL,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  raw_customer_message TEXT,
  developer_note TEXT,
  submitted_by_admin_id UUID,
  submitted_by_name TEXT,
  legitimacy_score NUMERIC NOT NULL DEFAULT 0,
  legitimacy_signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending_validation'
    CHECK (status IN ('pending_validation','dispatched','agent_diagnosing','agent_resolved','agent_unresolved','rejected_unverified','escalated_to_executive')),
  agent_response TEXT,
  agent_actions_taken JSONB DEFAULT '[]'::jsonb,
  diagnosis_summary TEXT,
  resolution_outcome TEXT CHECK (resolution_outcome IN ('fixed','no_action_needed','requires_executive','blocked','pending') OR resolution_outcome IS NULL),
  dispatched_at TIMESTAMPTZ,
  agent_resolved_at TIMESTAMPTZ,
  dept_lead_notified_at TIMESTAMPTZ,
  developer_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_aft_status ON public.autonomous_fixer_tickets(status);
CREATE INDEX idx_aft_submitter ON public.autonomous_fixer_tickets(submitted_by_admin_id);
CREATE INDEX idx_aft_tx ON public.autonomous_fixer_tickets(transaction_id);
CREATE INDEX idx_aft_created ON public.autonomous_fixer_tickets(created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.autonomous_fixer_tickets TO authenticated;
GRANT ALL ON public.autonomous_fixer_tickets TO service_role;

ALTER TABLE public.autonomous_fixer_tickets ENABLE ROW LEVEL SECURITY;

-- Admins can view all; developers (submitters) can only view their own
CREATE POLICY "Admins view tickets"
  ON public.autonomous_fixer_tickets FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert tickets"
  ON public.autonomous_fixer_tickets FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND submitted_by_admin_id = auth.uid());

CREATE POLICY "Service role updates tickets"
  ON public.autonomous_fixer_tickets FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_aft_updated_at
  BEFORE UPDATE ON public.autonomous_fixer_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══════════════════════════════════════════════════════════
-- LEGITIMACY VALIDATION + SUBMISSION RPC
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.submit_autonomous_fixer_ticket(
  _ticket_type TEXT,
  _tx_id_input TEXT,
  _raw_message TEXT DEFAULT NULL,
  _developer_note TEXT DEFAULT NULL,
  _preset_key TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id UUID := auth.uid();
  _admin_name TEXT;
  _tx RECORD;
  _score NUMERIC := 0;
  _signals JSONB := '{}'::jsonb;
  _recent_bugs INT := 0;
  _recent_status_changes INT := 0;
  _has_dispute BOOLEAN := false;
  _ticket_id UUID;
  _tech_chief_id UUID;
BEGIN
  IF _admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthenticated');
  END IF;

  IF NOT public.has_role(_admin_id, 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_admin');
  END IF;

  IF _tx_id_input IS NULL OR length(trim(_tx_id_input)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'tx_id_required',
      'message', 'A transaction ID is mandatory before any troubleshooting request can be submitted.');
  END IF;

  -- Look up transaction by tx_id or UUID
  SELECT * INTO _tx FROM public.transactions
  WHERE tx_id = _tx_id_input
     OR (length(_tx_id_input) = 36 AND id::text = _tx_id_input)
  LIMIT 1;

  IF _tx.id IS NULL THEN
    -- Hard-block: no such transaction
    INSERT INTO public.autonomous_fixer_tickets (
      ticket_type, preset_key, tx_id_input, raw_customer_message, developer_note,
      submitted_by_admin_id, legitimacy_score, legitimacy_signals, status
    ) VALUES (
      _ticket_type, _preset_key, _tx_id_input, _raw_message, _developer_note,
      _admin_id, 0,
      jsonb_build_object('tx_lookup', 'not_found'),
      'rejected_unverified'
    ) RETURNING id INTO _ticket_id;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'tx_not_found',
      'ticket_id', _ticket_id,
      'message', 'Transaction ID not found in system. Submission hard-blocked. Verify the order reference with the customer.'
    );
  END IF;

  -- Score corroborating signals
  _score := 30; -- baseline for valid tx

  SELECT count(*) INTO _recent_bugs FROM public.bug_reports
  WHERE (context->>'transaction_id' = _tx.id::text OR context->>'tx_id' = _tx.tx_id)
    AND created_at > now() - interval '7 days';

  IF _recent_bugs > 0 THEN _score := _score + 25; END IF;

  SELECT count(*) INTO _recent_status_changes FROM public.transaction_status_history
  WHERE transaction_id = _tx.id AND created_at > now() - interval '7 days';

  IF _recent_status_changes > 2 THEN _score := _score + 15; END IF;

  SELECT EXISTS(SELECT 1 FROM public.disputes WHERE transaction_id = _tx.id) INTO _has_dispute;
  IF _has_dispute THEN _score := _score + 20; END IF;

  -- Tx in problematic state adds weight
  IF _tx.status IN ('disputed','compliance_hold','kyc_hold','stuck','failed') THEN
    _score := _score + 20;
  END IF;

  -- Free-form requires raw_message
  IF _ticket_type = 'autonomous_fixer' AND (_raw_message IS NULL OR length(trim(_raw_message)) < 20) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'message_too_short',
      'message', 'Raw customer message must be at least 20 characters. Paste the full customer report.'
    );
  END IF;

  _signals := jsonb_build_object(
    'tx_lookup', 'found',
    'tx_status', _tx.status,
    'recent_bugs_7d', _recent_bugs,
    'recent_status_changes_7d', _recent_status_changes,
    'has_open_dispute', _has_dispute
  );

  -- Hard-block threshold: < 40 with no corroborating signals = likely false report
  IF _score < 40 AND _recent_bugs = 0 AND NOT _has_dispute AND _recent_status_changes = 0
     AND _tx.status NOT IN ('disputed','compliance_hold','kyc_hold','stuck','failed') THEN
    INSERT INTO public.autonomous_fixer_tickets (
      ticket_type, preset_key, tx_id_input, transaction_id, raw_customer_message, developer_note,
      submitted_by_admin_id, legitimacy_score, legitimacy_signals, status
    ) VALUES (
      _ticket_type, _preset_key, _tx_id_input, _tx.id, _raw_message, _developer_note,
      _admin_id, _score, _signals, 'rejected_unverified'
    ) RETURNING id INTO _ticket_id;

    -- Notify dept lead about unverified attempt (accountability trail)
    SELECT cac.admin_id INTO _tech_chief_id
    FROM chief_admin_config cac
    JOIN admin_departments ad ON ad.chief_admin_id = cac.admin_id
    WHERE ad.slug = 'technical_engineering' AND cac.is_active = true
    LIMIT 1;

    IF _tech_chief_id IS NOT NULL THEN
      PERFORM public.create_system_notification(
        _tech_chief_id,
        '⚠️ Unverified Fixer Submission Blocked',
        'Developer submitted a ticket for tx ' || _tx_id_input || ' but no corroborating system signals exist. Ticket hard-blocked.',
        'warning', false, NULL, 'autonomous_fixer_ticket', _ticket_id::text
      );
    END IF;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'unverified',
      'ticket_id', _ticket_id,
      'legitimacy_score', _score,
      'message', 'No corroborating system signals for this transaction. Submission blocked to protect against false reports. Dept lead has been notified.'
    );
  END IF;

  -- Valid ticket — dispatch
  INSERT INTO public.autonomous_fixer_tickets (
    ticket_type, preset_key, tx_id_input, transaction_id, raw_customer_message, developer_note,
    submitted_by_admin_id, legitimacy_score, legitimacy_signals, status, dispatched_at
  ) VALUES (
    _ticket_type, _preset_key, _tx_id_input, _tx.id, _raw_message, _developer_note,
    _admin_id, _score, _signals, 'dispatched', now()
  ) RETURNING id INTO _ticket_id;

  -- Notify dept lead
  SELECT cac.admin_id INTO _tech_chief_id
  FROM chief_admin_config cac
  JOIN admin_departments ad ON ad.chief_admin_id = cac.admin_id
  WHERE ad.slug = 'technical_engineering' AND cac.is_active = true
  LIMIT 1;

  IF _tech_chief_id IS NOT NULL AND _tech_chief_id != _admin_id THEN
    PERFORM public.create_system_notification(
      _tech_chief_id,
      '🛠️ Fixer Ticket Dispatched',
      CASE WHEN _ticket_type = 'preset'
        THEN 'Preset troubleshoot "' || COALESCE(_preset_key,'') || '" dispatched for tx ' || _tx_id_input
        ELSE 'Autonomous Fixer ticket dispatched for tx ' || _tx_id_input
      END,
      'info', false, NULL, 'autonomous_fixer_ticket', _ticket_id::text
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'ticket_id', _ticket_id,
    'transaction_id', _tx.id,
    'legitimacy_score', _score,
    'signals', _signals,
    'status', 'dispatched',
    'message', 'Ticket dispatched to autonomous agent. You will be notified when diagnosis completes.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_autonomous_fixer_ticket TO authenticated;

-- ═══════════════════════════════════════════════════════════
-- RESOLUTION RPC (called by edge function / agent)
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.resolve_autonomous_fixer_ticket(
  _ticket_id UUID,
  _outcome TEXT,
  _diagnosis TEXT,
  _agent_response TEXT,
  _actions JSONB DEFAULT '[]'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ticket RECORD;
  _new_status TEXT;
  _tech_chief_id UUID;
  _developer_msg TEXT;
BEGIN
  SELECT * INTO _ticket FROM public.autonomous_fixer_tickets WHERE id = _ticket_id;
  IF _ticket.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'ticket_not_found');
  END IF;

  _new_status := CASE _outcome
    WHEN 'fixed' THEN 'agent_resolved'
    WHEN 'no_action_needed' THEN 'agent_resolved'
    WHEN 'requires_executive' THEN 'escalated_to_executive'
    WHEN 'blocked' THEN 'agent_unresolved'
    ELSE 'agent_diagnosing'
  END;

  UPDATE public.autonomous_fixer_tickets SET
    status = _new_status,
    resolution_outcome = _outcome,
    diagnosis_summary = _diagnosis,
    agent_response = _agent_response,
    agent_actions_taken = _actions,
    agent_resolved_at = CASE WHEN _new_status != 'agent_diagnosing' THEN now() ELSE NULL END,
    developer_notified_at = now(),
    dept_lead_notified_at = now()
  WHERE id = _ticket_id;

  -- Build developer-facing message
  _developer_msg := CASE _outcome
    WHEN 'fixed' THEN '✅ Issue diagnosed and resolved automatically. ' || COALESCE(_diagnosis, '')
    WHEN 'no_action_needed' THEN 'ℹ️ Diagnosis complete — no action needed. ' || COALESCE(_diagnosis, '')
    WHEN 'requires_executive' THEN '🚨 Autonomous agent could not safely resolve this. Reach out to the Executive department immediately — they have direct contact with TrustLock core code.'
    WHEN 'blocked' THEN '⛔ Agent blocked from resolving. ' || COALESCE(_diagnosis, '') || ' Escalate to Executive.'
    ELSE 'Diagnosis in progress.'
  END;

  -- Notify the submitting developer
  IF _ticket.submitted_by_admin_id IS NOT NULL THEN
    PERFORM public.create_system_notification(
      _ticket.submitted_by_admin_id,
      'Autonomous Fixer Report — Tx ' || _ticket.tx_id_input,
      _developer_msg,
      CASE _outcome WHEN 'fixed' THEN 'success' WHEN 'no_action_needed' THEN 'info' ELSE 'warning' END,
      _outcome IN ('requires_executive','blocked'),
      NULL, 'autonomous_fixer_ticket', _ticket_id::text
    );
  END IF;

  -- Notify dept lead
  SELECT cac.admin_id INTO _tech_chief_id
  FROM chief_admin_config cac
  JOIN admin_departments ad ON ad.chief_admin_id = cac.admin_id
  WHERE ad.slug = 'technical_engineering' AND cac.is_active = true
  LIMIT 1;

  IF _tech_chief_id IS NOT NULL AND _tech_chief_id != _ticket.submitted_by_admin_id THEN
    PERFORM public.create_system_notification(
      _tech_chief_id,
      'Fixer Resolution — Tx ' || _ticket.tx_id_input,
      _developer_msg,
      CASE _outcome WHEN 'fixed' THEN 'success' ELSE 'info' END,
      _outcome IN ('requires_executive','blocked'),
      NULL, 'autonomous_fixer_ticket', _ticket_id::text
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'new_status', _new_status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_autonomous_fixer_ticket TO authenticated, service_role;