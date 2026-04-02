-- Add action-required fields to notifications
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS is_action_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS action_url TEXT,
  ADD COLUMN IF NOT EXISTS action_completed_at TIMESTAMP WITH TIME ZONE;

-- Index for quick lookup of unresolved action-required notifications
CREATE INDEX IF NOT EXISTS idx_notifications_action_required
  ON public.notifications (user_id, is_action_required)
  WHERE is_action_required = true AND action_completed_at IS NULL;