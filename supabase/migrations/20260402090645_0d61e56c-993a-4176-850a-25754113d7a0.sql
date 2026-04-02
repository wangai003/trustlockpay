
-- Message threads table
CREATE TABLE public.message_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_1 UUID NOT NULL,
  participant_2 UUID NOT NULL,
  transaction_id UUID REFERENCES public.transactions(id),
  subject TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'open',
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  attachment_url TEXT,
  attachment_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_message_threads_p1 ON public.message_threads(participant_1);
CREATE INDEX idx_message_threads_p2 ON public.message_threads(participant_2);
CREATE INDEX idx_message_threads_tx ON public.message_threads(transaction_id);
CREATE INDEX idx_messages_thread ON public.messages(thread_id, created_at);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);

-- RLS on threads
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read own threads"
  ON public.message_threads FOR SELECT TO authenticated
  USING (participant_1 = auth.uid() OR participant_2 = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Participants insert threads"
  ON public.message_threads FOR INSERT TO authenticated
  WITH CHECK (participant_1 = auth.uid() OR participant_2 = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Participants update own threads"
  ON public.message_threads FOR UPDATE TO authenticated
  USING (participant_1 = auth.uid() OR participant_2 = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Thread participants read messages"
  ON public.messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.message_threads t
      WHERE t.id = messages.thread_id
        AND (t.participant_1 = auth.uid() OR t.participant_2 = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE POLICY "Thread participants insert messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.message_threads t
      WHERE t.id = messages.thread_id
        AND (t.participant_1 = auth.uid() OR t.participant_2 = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_threads;
