
-- ═══════════════════════════════════════════════════════════
-- 1. FIX: Arbitrator sessions — replace anon SELECT with SECURITY DEFINER
-- ═══════════════════════════════════════════════════════════

-- Create a safe function for anon token lookup
CREATE OR REPLACE FUNCTION public.get_arbitrator_session_by_token(_token text)
RETURNS TABLE(
  id uuid,
  arbitrator_name text,
  dispute_id uuid,
  transaction_id uuid,
  status text,
  expires_at timestamptz,
  case_bundle_generated boolean,
  case_bundle_url text,
  ruling_uploaded_at timestamptz,
  ruling_file_name text,
  ruling_file_url text,
  ruling_anchored boolean,
  ruling_distributed boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.id, s.arbitrator_name, s.dispute_id, s.transaction_id,
    s.status, s.expires_at, s.case_bundle_generated, s.case_bundle_url,
    s.ruling_uploaded_at, s.ruling_file_name, s.ruling_file_url,
    s.ruling_anchored, s.ruling_distributed, s.created_at
  FROM arbitrator_sessions s
  WHERE s.access_token = _token
    AND s.status = 'active'
    AND s.expires_at > now();
$$;

-- Drop old anon policy
DROP POLICY IF EXISTS "Token-scoped read arbitrator session" ON public.arbitrator_sessions;

-- Replace with deny-all anon (force usage of the function)
CREATE POLICY "No direct anon read arbitrator sessions"
ON public.arbitrator_sessions FOR SELECT TO anon USING (false);

-- ═══════════════════════════════════════════════════════════
-- 2. FIX: Audit sessions — replace anon SELECT with SECURITY DEFINER
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_audit_session_by_token(_token text)
RETURNS TABLE(
  id uuid,
  auditor_name text,
  allowed_tables text[],
  can_export boolean,
  is_active boolean,
  access_count integer,
  last_accessed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.id, s.auditor_name, s.allowed_tables, s.can_export,
    s.is_active, s.access_count, s.last_accessed_at,
    s.expires_at, s.created_at
  FROM audit_sessions s
  WHERE s.access_token = _token;
$$;

-- Drop old anon policy
DROP POLICY IF EXISTS "Anon read audit sessions by token scoped" ON public.audit_sessions;

-- Deny direct anon reads
CREATE POLICY "No direct anon read audit sessions"
ON public.audit_sessions FOR SELECT TO anon USING (false);

-- ═══════════════════════════════════════════════════════════
-- 3. FIX: Recreate safe views WITHOUT access_token/password_hash
-- ═══════════════════════════════════════════════════════════

DROP VIEW IF EXISTS public.arbitrator_sessions_safe;
CREATE VIEW public.arbitrator_sessions_safe AS
SELECT
  id, arbitrator_name, arbitrator_email,
  dispute_id, transaction_id, status, expires_at,
  case_bundle_generated, case_bundle_url,
  ruling_uploaded_at, ruling_file_name, ruling_file_url,
  ruling_anchored, ruling_distributed,
  access_count, last_accessed_at,
  created_at, updated_at
FROM public.arbitrator_sessions;

DROP VIEW IF EXISTS public.audit_sessions_safe;
CREATE VIEW public.audit_sessions_safe AS
SELECT
  id, auditor_name, auditor_email,
  allowed_tables, can_export, is_active,
  access_count, last_accessed_at,
  expires_at, created_at, updated_at, created_by
FROM public.audit_sessions;

-- ═══════════════════════════════════════════════════════════
-- 4. FIX: Lender certificates — require token match for anon
-- ═══════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Public can verify by token" ON public.lender_certificates;

CREATE POLICY "Public verify by specific token"
ON public.lender_certificates FOR SELECT TO anon
USING (
  status = 'active'
  AND expires_at > now()
  AND verification_token = (current_setting('request.headers', true)::json->>'x-verification-token')
);

-- ═══════════════════════════════════════════════════════════
-- 5. FIX: Notifications — restrict insert policy
-- ═══════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
-- Keep the scoped one if it exists, else create:
DROP POLICY IF EXISTS "Users insert own notifications" ON public.notifications;

CREATE POLICY "Users insert own notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Create a SECURITY DEFINER function for system/trigger notification inserts
CREATE OR REPLACE FUNCTION public.create_system_notification(
  _user_id uuid,
  _title text,
  _message text,
  _type text DEFAULT 'info',
  _is_action_required boolean DEFAULT false,
  _action_url text DEFAULT NULL,
  _related_entity_type text DEFAULT NULL,
  _related_entity_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  INSERT INTO notifications (user_id, title, message, type, is_action_required, action_url, related_entity_type, related_entity_id)
  VALUES (_user_id, _title, _message, _type, _is_action_required, _action_url, _related_entity_type, _related_entity_id)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- 6. FIX: Message attachments — scope to thread participants
-- ═══════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can read message attachments" ON storage.objects;

CREATE POLICY "Users can read own or thread message attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND (
    -- User's own uploads
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Uploads from someone in a shared thread
    EXISTS (
      SELECT 1 FROM public.message_threads mt
      WHERE (
        (mt.participant_1 = auth.uid() AND mt.participant_2::text = (storage.foldername(name))[1])
        OR
        (mt.participant_2 = auth.uid() AND mt.participant_1::text = (storage.foldername(name))[1])
      )
    )
  )
);

-- ═══════════════════════════════════════════════════════════
-- 7. FIX: Profiles — create safe counterparty view
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.profiles_counterparty_safe AS
SELECT
  id,
  full_name,
  company_name,
  entity_type,
  avatar_url,
  status
FROM public.profiles;
