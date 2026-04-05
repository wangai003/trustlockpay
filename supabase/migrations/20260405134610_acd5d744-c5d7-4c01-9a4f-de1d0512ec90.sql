
-- Add industry column to vendor_sites
ALTER TABLE public.vendor_sites
ADD COLUMN industry text DEFAULT NULL;

-- Add site_id to vendor_widget_fees for per-site tracking
ALTER TABLE public.vendor_widget_fees
ADD COLUMN site_id uuid REFERENCES public.vendor_sites(id) ON DELETE CASCADE DEFAULT NULL;

-- Drop old unique constraint on vendor_id (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vendor_widget_fees_vendor_id_key'
    AND conrelid = 'public.vendor_widget_fees'::regclass
  ) THEN
    ALTER TABLE public.vendor_widget_fees DROP CONSTRAINT vendor_widget_fees_vendor_id_key;
  END IF;
END $$;

-- Add new unique constraint for per-site fee tracking
ALTER TABLE public.vendor_widget_fees
ADD CONSTRAINT vendor_widget_fees_vendor_site_unique UNIQUE (vendor_id, site_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_vendor_sites_industry ON public.vendor_sites(industry);
CREATE INDEX IF NOT EXISTS idx_vendor_widget_fees_site_id ON public.vendor_widget_fees(site_id);
