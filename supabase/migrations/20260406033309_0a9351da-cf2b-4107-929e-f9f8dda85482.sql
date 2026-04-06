
-- 1. Add transaction_source to transactions
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS transaction_source text DEFAULT 'widget';

CREATE INDEX IF NOT EXISTS idx_transactions_source ON public.transactions (transaction_source);

-- 2. Standalone analytics (mirrors widget_analytics for standalone links)
CREATE TABLE IF NOT EXISTS public.standalone_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  standalone_link_id text,
  vendor_id uuid,
  event_type text NOT NULL,
  visitor_fingerprint text,
  page_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.standalone_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert standalone analytics"
  ON public.standalone_analytics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Vendors can view their own standalone analytics"
  ON public.standalone_analytics FOR SELECT
  USING (vendor_id::text = auth.uid()::text);

CREATE INDEX idx_standalone_analytics_vendor ON public.standalone_analytics (vendor_id, created_at DESC);
CREATE INDEX idx_standalone_analytics_link ON public.standalone_analytics (standalone_link_id, event_type);

-- 3. Platform analytics snapshots (admin-only daily rollups)
CREATE TABLE IF NOT EXISTS public.platform_analytics_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL,
  metric_key text NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0,
  dimension_key text,
  dimension_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_analytics_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view platform snapshots"
  ON public.platform_analytics_snapshots FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE INDEX idx_platform_snapshots_date ON public.platform_analytics_snapshots (snapshot_date DESC, metric_key);
CREATE INDEX idx_platform_snapshots_metric ON public.platform_analytics_snapshots (metric_key, dimension_key, snapshot_date DESC);
