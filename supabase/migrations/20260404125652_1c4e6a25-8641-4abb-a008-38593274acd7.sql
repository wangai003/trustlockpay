-- Track which admin account sent each message
ALTER TABLE public.messages
ADD COLUMN admin_account_id uuid REFERENCES public.admin_accounts(id) ON DELETE SET NULL DEFAULT NULL;

-- Index for efficient lookup of messages by admin
CREATE INDEX idx_messages_admin_account_id ON public.messages(admin_account_id) WHERE admin_account_id IS NOT NULL;
