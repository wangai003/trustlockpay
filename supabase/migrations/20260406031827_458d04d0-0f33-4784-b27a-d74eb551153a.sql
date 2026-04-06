-- 1. Add network_mode to vendor_offerings
ALTER TABLE public.vendor_offerings
  ADD COLUMN IF NOT EXISTS network_mode text NOT NULL DEFAULT 'mainnet';

CREATE INDEX IF NOT EXISTS idx_vendor_offerings_network
  ON public.vendor_offerings (vendor_id, network_mode);

-- 2. Add network_mode to vendor_site_configs
ALTER TABLE public.vendor_site_configs
  ADD COLUMN IF NOT EXISTS network_mode text NOT NULL DEFAULT 'mainnet';

CREATE INDEX IF NOT EXISTS idx_vendor_site_configs_network
  ON public.vendor_site_configs (vendor_id, network_mode);

-- 3. Widget analytics table
CREATE TABLE IF NOT EXISTS public.widget_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  vendor_id uuid NOT NULL,
  site_id text,
  offering_id text,
  visitor_fingerprint text,
  referrer_url text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.widget_analytics ENABLE ROW LEVEL SECURITY;

-- Public insert (widget fires from external sites with no auth)
CREATE POLICY "Anyone can insert widget analytics"
  ON public.widget_analytics FOR INSERT
  WITH CHECK (true);

-- Only vendor can read their own analytics
CREATE POLICY "Vendors read own analytics"
  ON public.widget_analytics FOR SELECT
  USING (auth.uid() = vendor_id);

CREATE INDEX idx_widget_analytics_vendor
  ON public.widget_analytics (vendor_id, created_at DESC);

CREATE INDEX idx_widget_analytics_event
  ON public.widget_analytics (event_type, vendor_id);

-- 4. Bulk import jobs table
CREATE TABLE IF NOT EXISTS public.bulk_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL,
  file_url text,
  status text NOT NULL DEFAULT 'pending',
  total_rows int DEFAULT 0,
  processed_rows int DEFAULT 0,
  error_log jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bulk_import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors manage own import jobs"
  ON public.bulk_import_jobs FOR ALL
  USING (auth.uid() = vendor_id)
  WITH CHECK (auth.uid() = vendor_id);

CREATE TRIGGER update_bulk_import_jobs_updated_at
  BEFORE UPDATE ON public.bulk_import_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();