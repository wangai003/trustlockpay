
CREATE TABLE public.platform_widget_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL,
  multi_vendor_enabled BOOLEAN NOT NULL DEFAULT false,
  platform_commission_percent NUMERIC(5,2) DEFAULT 0,
  product_api_url TEXT,
  webhook_url TEXT,
  webhook_secret TEXT,
  white_label_enabled BOOLEAN NOT NULL DEFAULT false,
  brand_primary_color TEXT DEFAULT '#1a56db',
  brand_logo_url TEXT,
  brand_name TEXT,
  default_industry_override TEXT,
  auto_kyc_passthrough BOOLEAN NOT NULL DEFAULT false,
  sandbox_mode BOOLEAN NOT NULL DEFAULT true,
  allowed_payment_methods TEXT[] DEFAULT ARRAY['card','bank_transfer','mobile_money','crypto'],
  max_order_amount NUMERIC(12,2),
  min_order_amount NUMERIC(12,2) DEFAULT 1.00,
  auto_refund_window_hours INTEGER DEFAULT 72,
  custom_checkout_message TEXT,
  require_buyer_account BOOLEAN NOT NULL DEFAULT false,
  enable_bulk_onboarding BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(vendor_id)
);

ALTER TABLE public.platform_widget_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own widget config"
ON public.platform_widget_configs FOR SELECT
TO authenticated
USING (vendor_id = auth.uid());

CREATE POLICY "Users can create their own widget config"
ON public.platform_widget_configs FOR INSERT
TO authenticated
WITH CHECK (vendor_id = auth.uid());

CREATE POLICY "Users can update their own widget config"
ON public.platform_widget_configs FOR UPDATE
TO authenticated
USING (vendor_id = auth.uid());

CREATE TRIGGER update_platform_widget_configs_updated_at
BEFORE UPDATE ON public.platform_widget_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
