
-- Allow admin role to insert messages with the sentinel sender_id
DROP POLICY IF EXISTS "Thread participants insert messages" ON public.messages;
CREATE POLICY "Thread participants insert messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      sender_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM message_threads t
        WHERE t.id = messages.thread_id
        AND (t.participant_1 = auth.uid() OR t.participant_2 = auth.uid())
      )
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Allow admin role to read all messages (not just their own threads)
DROP POLICY IF EXISTS "Thread participants read messages" ON public.messages;
CREATE POLICY "Thread participants read messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM message_threads t
      WHERE t.id = messages.thread_id
      AND (t.participant_1 = auth.uid() OR t.participant_2 = auth.uid())
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Allow admin to update messages (mark as read)
CREATE POLICY "Admins update messages"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admin to insert threads with sentinel ID
DROP POLICY IF EXISTS "Participants insert threads" ON public.message_threads;
CREATE POLICY "Participants insert threads"
  ON public.message_threads FOR INSERT
  TO authenticated
  WITH CHECK (
    participant_1 = auth.uid()
    OR participant_2 = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Allow admin to update any thread
DROP POLICY IF EXISTS "Participants update own threads" ON public.message_threads;
CREATE POLICY "Participants update own threads"
  ON public.message_threads FOR UPDATE
  TO authenticated
  USING (
    participant_1 = auth.uid()
    OR participant_2 = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
  );
