-- Fix: department slug is 'technical' (not 'technical_engineering'),
-- and dept lead is identified via chief_admin_config rank-1 (no per-dept chief column exists).

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
  _tx RECORD;
  _score NUMERIC := 0;
  _signals JSONB := '{}'::jsonb;
  _recent_bugs INT := 0;
  _recent_status_changes INT := 0;
  _has_dispute BOOLEAN := false;
  _ticket_id UUID;
  _dept_lead_id UUID;
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

  SELECT * INTO _tx FROM public.transactions
  WHERE tx_id = _tx_id_input
     OR (length(_tx_id_input) = 36 AND id::text = _tx_id_input)
  LIMIT 1;

  -- Dept lead = active rank-1 Chief Admin (oversight role)
  SELECT admin_id INTO _dept_lead_id
  FROM chief_admin_config
  WHERE is_active = true AND rank = 1
  ORDER BY designated_at ASC LIMIT 1;

  IF _tx.id IS NULL THEN
    INSERT INTO public.autonomous_fixer_tickets (
      ticket_type, preset_key, tx_id_input, raw_customer_message, developer_note,
      submitted_by_admin_id, legitimacy_score, legitimacy_signals, status
    ) VALUES (
      _ticket_type, _preset_key, _tx_id_input, _raw_message, _developer_note,
      _admin_id, 0, jsonb_build_object('tx_lookup','not_found'), 'rejected_unverified'
    ) RETURNING id INTO _ticket_id;

    IF _dept_lead_id IS NOT NULL THEN
      PERFORM public.create_system_notification(
        _dept_lead_id,
        '⚠️ Fixer Submission Blocked — Invalid Tx',
        'Developer submitted a ticket for tx ' || _tx_id_input || ' but no such transaction exists. Possible false report.',
        'warning', false, NULL, 'autonomous_fixer_ticket', _ticket_id::text
      );
    END IF;

    RETURN jsonb_build_object('success', false, 'error', 'tx_not_found', 'ticket_id', _ticket_id,
      'message', 'Transaction ID not found. Submission hard-blocked. Verify the order reference with the customer.');
  END IF;

  _score := 30;
  SELECT count(*) INTO _recent_bugs FROM public.bug_reports
  WHERE (context->>'transaction_id' = _tx.id::text OR context->>'tx_id' = _tx.tx_id)
    AND created_at > now() - interval '7 days';
  IF _recent_bugs > 0 THEN _score := _score + 25; END IF;

  SELECT count(*) INTO _recent_status_changes FROM public.transaction_status_history
  WHERE transaction_id = _tx.id AND created_at > now() - interval '7 days';
  IF _recent_status_changes > 2 THEN _score := _score + 15; END IF;

  SELECT EXISTS(SELECT 1 FROM public.disputes WHERE transaction_id = _tx.id) INTO _has_dispute;
  IF _has_dispute THEN _score := _score + 20; END IF;

  IF _tx.status IN ('disputed','compliance_hold','kyc_hold','stuck','failed') THEN
    _score := _score + 20;
  END IF;

  IF _ticket_type = 'autonomous_fixer' AND (_raw_message IS NULL OR length(trim(_raw_message)) < 20) THEN
    RETURN jsonb_build_object('success', false, 'error', 'message_too_short',
      'message', 'Raw customer message must be at least 20 characters. Paste the full customer report.');
  END IF;

  _signals := jsonb_build_object(
    'tx_lookup','found','tx_status', _tx.status,
    'recent_bugs_7d', _recent_bugs,
    'recent_status_changes_7d', _recent_status_changes,
    'has_open_dispute', _has_dispute
  );

  IF _score < 40 AND _recent_bugs = 0 AND NOT _has_dispute AND _recent_status_changes = 0
     AND _tx.status NOT IN ('disputed','compliance_hold','kyc_hold','stuck','failed') THEN
    INSERT INTO public.autonomous_fixer_tickets (
      ticket_type, preset_key, tx_id_input, transaction_id, raw_customer_message, developer_note,
      submitted_by_admin_id, legitimacy_score, legitimacy_signals, status
    ) VALUES (
      _ticket_type, _preset_key, _tx_id_input, _tx.id, _raw_message, _developer_note,
      _admin_id, _score, _signals, 'rejected_unverified'
    ) RETURNING id INTO _ticket_id;

    IF _dept_lead_id IS NOT NULL THEN
      PERFORM public.create_system_notification(
        _dept_lead_id,
        '⚠️ Unverified Fixer Submission Blocked',
        'Developer submitted a ticket for tx ' || _tx_id_input || ' but no corroborating system signals exist. Ticket hard-blocked.',
        'warning', false, NULL, 'autonomous_fixer_ticket', _ticket_id::text
      );
    END IF;

    RETURN jsonb_build_object('success', false, 'error', 'unverified', 'ticket_id', _ticket_id,
      'legitimacy_score', _score,
      'message', 'No corroborating system signals for this transaction. Submission blocked. Dept lead notified.');
  END IF;

  INSERT INTO public.autonomous_fixer_tickets (
    ticket_type, preset_key, tx_id_input, transaction_id, raw_customer_message, developer_note,
    submitted_by_admin_id, legitimacy_score, legitimacy_signals, status, dispatched_at
  ) VALUES (
    _ticket_type, _preset_key, _tx_id_input, _tx.id, _raw_message, _developer_note,
    _admin_id, _score, _signals, 'dispatched', now()
  ) RETURNING id INTO _ticket_id;

  IF _dept_lead_id IS NOT NULL AND _dept_lead_id != _admin_id THEN
    PERFORM public.create_system_notification(
      _dept_lead_id,
      '🛠️ Fixer Ticket Dispatched',
      CASE WHEN _ticket_type = 'preset'
        THEN 'Preset "' || COALESCE(_preset_key,'') || '" dispatched for tx ' || _tx_id_input
        ELSE 'Autonomous Fixer ticket dispatched for tx ' || _tx_id_input
      END,
      'info', false, NULL, 'autonomous_fixer_ticket', _ticket_id::text
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true, 'ticket_id', _ticket_id, 'transaction_id', _tx.id,
    'legitimacy_score', _score, 'signals', _signals, 'status', 'dispatched',
    'message', 'Ticket dispatched to autonomous agent. You will be notified when diagnosis completes.'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_autonomous_fixer_ticket(
  _ticket_id UUID, _outcome TEXT, _diagnosis TEXT, _agent_response TEXT, _actions JSONB DEFAULT '[]'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _ticket RECORD;
  _new_status TEXT;
  _dept_lead_id UUID;
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
    status = _new_status, resolution_outcome = _outcome,
    diagnosis_summary = _diagnosis, agent_response = _agent_response,
    agent_actions_taken = _actions,
    agent_resolved_at = CASE WHEN _new_status != 'agent_diagnosing' THEN now() ELSE NULL END,
    developer_notified_at = now(), dept_lead_notified_at = now()
  WHERE id = _ticket_id;

  _developer_msg := CASE _outcome
    WHEN 'fixed' THEN '✅ Issue diagnosed and resolved automatically. ' || COALESCE(_diagnosis,'')
    WHEN 'no_action_needed' THEN 'ℹ️ Diagnosis complete — no action needed. ' || COALESCE(_diagnosis,'')
    WHEN 'requires_executive' THEN '🚨 Autonomous agent could not safely resolve. Reach out to the Executive department immediately — they have direct contact with TrustLock core code.'
    WHEN 'blocked' THEN '⛔ Agent blocked from resolving. ' || COALESCE(_diagnosis,'') || ' Escalate to Executive.'
    ELSE 'Diagnosis in progress.'
  END;

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

  SELECT admin_id INTO _dept_lead_id
  FROM chief_admin_config WHERE is_active = true AND rank = 1
  ORDER BY designated_at ASC LIMIT 1;

  IF _dept_lead_id IS NOT NULL AND _dept_lead_id != _ticket.submitted_by_admin_id THEN
    PERFORM public.create_system_notification(
      _dept_lead_id,
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