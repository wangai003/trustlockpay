
-- 1. Encryption key storage
CREATE TABLE public.encryption_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  key_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.encryption_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own key"
  ON public.encryption_keys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own key"
  ON public.encryption_keys FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone authenticated can read public keys"
  ON public.encryption_keys FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER update_encryption_keys_updated_at
  BEFORE UPDATE ON public.encryption_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Add encryption columns to admin messaging tables
ALTER TABLE public.admin_direct_messages
  ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS encryption_version INTEGER DEFAULT NULL;

ALTER TABLE public.admin_dept_chat_messages
  ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS encryption_version INTEGER DEFAULT NULL;

-- 3. Peer-to-peer encrypted messages table (E2E)
CREATE TABLE public.encrypted_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  encrypted_body TEXT NOT NULL,
  nonce TEXT NOT NULL,
  sender_public_key_id UUID REFERENCES public.encryption_keys(id),
  thread_id TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  encryption_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_encrypted_messages_sender ON public.encrypted_messages(sender_id);
CREATE INDEX idx_encrypted_messages_recipient ON public.encrypted_messages(recipient_id);
CREATE INDEX idx_encrypted_messages_thread ON public.encrypted_messages(thread_id);

ALTER TABLE public.encrypted_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
  ON public.encrypted_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages"
  ON public.encrypted_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can mark as read"
  ON public.encrypted_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = recipient_id);
