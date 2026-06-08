ALTER TABLE public.autonomous_fixer_tickets ADD COLUMN IF NOT EXISTS executive_notified_at TIMESTAMPTZ;

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
  _dept_lead_id UUID;
  _developer_msg TEXT;
  _exec_msg TEXT;
  _exec_admin RECORD;
BEGIN
  SELECT * INTO _ticket FROM public.autonomous_fixer_tickets WHERE id = _ticket_id;
  IF _ticket.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'ticket_not_found');
  END IF;

  _new_status := CASE _outcome
    WHEN 'auto_fixed' THEN 'agent_resolved'
    WHEN 'fixed' THEN 'agent_resolved'
    WHEN 'no_action_needed' THEN 'agent_resolved'
    WHEN 'requires_executive' THEN 'escalated_to_executive'
    WHEN 'requires_code_change' THEN 'agent_unresolved'
    WHEN 'blocked' THEN 'agent_unresolved'
    ELSE 'agent_diagnosing'
  END;

  UPDATE public.autonomous_fixer_tickets SET
    status = _new_status,
    resolution_outcome = _outcome,
    diagnosis_summary = _diagnosis,
    agent_response = _agent_response,
    agent_actions_taken = _actions,
    agent_resolved_at = CASE WHEN _new_status NOT IN ('agent_diagnosing') THEN now() ELSE NULL END,
    developer_notified_at = now(),
    dept_lead_notified_at = now()
  WHERE id = _ticket_id;

  _developer_msg := CASE _outcome
    WHEN 'auto_fixed' THEN '✅ Issue diagnosed and resolved automatically. ' || COALESCE(_diagnosis, '')
    WHEN 'fixed' THEN '✅ Issue diagnosed and resolved automatically. ' || COALESCE(_diagnosis, '')
    WHEN 'no_action_needed' THEN 'ℹ️ Diagnosis complete — no action needed. ' || COALESCE(_diagnosis, '')
    WHEN 'requires_executive' THEN '🚨 Autonomous agent could not safely resolve this. Reach out to the Executive department immediately — they have direct contact with TrustLock core code.'
    WHEN 'requires_code_change' THEN '🔧 Code-level patch required. ' || COALESCE(_diagnosis, '') || ' Escalate to Executive for owner relay.'
    WHEN 'blocked' THEN '⛔ Agent blocked from resolving. ' || COALESCE(_diagnosis, '') || ' Escalate to Executive.'
    ELSE 'Diagnosis in progress.'
  END;

  IF _ticket.submitted_by_admin_id IS NOT NULL THEN
    PERFORM public.create_system_notification(
      _ticket.submitted_by_admin_id,
      'Autonomous Fixer Report — Tx ' || _ticket.tx_id_input,
      _developer_msg,
      CASE _outcome
        WHEN 'auto_fixed' THEN 'success'
        WHEN 'fixed' THEN 'success'
        WHEN 'no_action_needed' THEN 'info'
        ELSE 'warning'
      END,
      _outcome IN ('requires_executive', 'requires_code_change', 'blocked'),
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
      CASE _outcome
        WHEN 'auto_fixed' THEN 'success'
        WHEN 'fixed' THEN 'success'
        ELSE 'info'
      END,
      _outcome IN ('requires_executive', 'requires_code_change', 'blocked'),
      NULL, 'autonomous_fixer_ticket', _ticket_id::text
    );
  END IF;

  IF _outcome IN ('requires_executive', 'requires_code_change')
     OR (_ticket.scope = 'systemic' AND _outcome = 'auto_fixed') THEN

    _exec_msg := CASE _outcome
      WHEN 'requires_executive' THEN '🚨 Fixer escalated to Executive — Tx ' || _ticket.tx_id_input || ': ' || COALESCE(_diagnosis, '')
      WHEN 'requires_code_change' THEN '🔧 Fixer requires code change — Tx ' || _ticket.tx_id_input || ': ' || COALESCE(_diagnosis, '') || ' Awaiting owner relay.'
      WHEN 'auto_fixed' THEN '✅ Systemic fix applied — Tx ' || _ticket.tx_id_input || ': ' || COALESCE(_diagnosis, '') || ' Affected ' || COALESCE(_ticket.affected_count::text, '0') || ' records.'
      ELSE 'Fixer outcome — Tx ' || _ticket.tx_id_input || ': ' || COALESCE(_diagnosis, '')
    END;

    FOR _exec_admin IN
      SELECT aa.id
      FROM public.admin_accounts aa
      JOIN public.admin_departments ad ON ad.id = aa.department_id
      WHERE ad.slug = 'executive'
        AND aa.is_setup = true
        AND aa.locked_at IS NULL
        AND (aa.is_deleted IS NOT true OR aa.is_deleted IS NULL)
    LOOP
      IF _exec_admin.id != _ticket.submitted_by_admin_id AND _exec_admin.id != _dept_lead_id THEN
        PERFORM public.create_system_notification(
          _exec_admin.id,
          'Autonomous Fixer — Executive Alert — Tx ' || _ticket.tx_id_input,
          _exec_msg,
          CASE _outcome WHEN 'auto_fixed' THEN 'success' ELSE 'warning' END,
          true,
          NULL, 'autonomous_fixer_ticket', _ticket_id::text
        );
      END IF;
    END LOOP;

    UPDATE public.autonomous_fixer_tickets
    SET executive_notified_at = now()
    WHERE id = _ticket_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'new_status', _new_status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_autonomous_fixer_ticket TO authenticated, service_role;