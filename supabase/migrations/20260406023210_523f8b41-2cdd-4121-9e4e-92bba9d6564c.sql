
-- Vendor offerings catalog
CREATE TABLE public.vendor_offerings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL,
  site_id UUID REFERENCES public.vendor_sites(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  offering_type TEXT NOT NULL DEFAULT 'product' CHECK (offering_type IN ('product', 'service', 'project')),
  industry_key TEXT NOT NULL DEFAULT 'ecommerce',
  category TEXT,
  description TEXT,
  base_price NUMERIC,
  currency TEXT NOT NULL DEFAULT 'USD',
  unit_label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_offerings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own offerings"
  ON public.vendor_offerings FOR SELECT
  USING (auth.uid() = vendor_id);

CREATE POLICY "Users can create own offerings"
  ON public.vendor_offerings FOR INSERT
  WITH CHECK (auth.uid() = vendor_id);

CREATE POLICY "Users can update own offerings"
  ON public.vendor_offerings FOR UPDATE
  USING (auth.uid() = vendor_id);

CREATE POLICY "Users can delete own offerings"
  ON public.vendor_offerings FOR DELETE
  USING (auth.uid() = vendor_id);

CREATE TRIGGER update_vendor_offerings_updated_at
  BEFORE UPDATE ON public.vendor_offerings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Multi-industry per site mapping
CREATE TABLE public.vendor_site_industries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.vendor_sites(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL,
  industry_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (site_id, industry_key)
);

ALTER TABLE public.vendor_site_industries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own site industries"
  ON public.vendor_site_industries FOR SELECT
  USING (auth.uid() = vendor_id);

CREATE POLICY "Users can create own site industries"
  ON public.vendor_site_industries FOR INSERT
  WITH CHECK (auth.uid() = vendor_id);

CREATE POLICY "Users can delete own site industries"
  ON public.vendor_site_industries FOR DELETE
  USING (auth.uid() = vendor_id);

-- Index for fast lookups
CREATE INDEX idx_vendor_offerings_vendor ON public.vendor_offerings(vendor_id);
CREATE INDEX idx_vendor_offerings_site ON public.vendor_offerings(site_id);
CREATE INDEX idx_vendor_site_industries_site ON public.vendor_site_industries(site_id);
