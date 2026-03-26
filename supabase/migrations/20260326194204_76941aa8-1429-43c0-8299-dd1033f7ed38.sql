
-- Create tax_rates config table
CREATE TABLE public.tax_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  country_name text NOT NULL,
  tax_type text NOT NULL DEFAULT 'VAT',
  rate_percentage numeric NOT NULL DEFAULT 0,
  trade_bloc text,
  tariff_rate_percentage numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(country_code)
);

ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read tax rates"
ON public.tax_rates
FOR SELECT TO anon, authenticated
USING (true);

-- Add tax_breakdown jsonb column to transactions
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS tax_breakdown jsonb DEFAULT '{}'::jsonb;

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tax_rates;

-- Create index
CREATE INDEX idx_tax_rates_country_code ON public.tax_rates(country_code);

-- Seed tax rates
INSERT INTO public.tax_rates (country_code, country_name, tax_type, rate_percentage, trade_bloc, tariff_rate_percentage) VALUES
('US', 'United States', 'Sales Tax', 7.0, 'USMCA', 3.5),
('GB', 'United Kingdom', 'VAT', 20.0, NULL, 2.5),
('DE', 'Germany', 'VAT', 19.0, 'EU', 0),
('FR', 'France', 'VAT', 20.0, 'EU', 0),
('IT', 'Italy', 'VAT', 22.0, 'EU', 0),
('ES', 'Spain', 'VAT', 21.0, 'EU', 0),
('NL', 'Netherlands', 'VAT', 21.0, 'EU', 0),
('BE', 'Belgium', 'VAT', 21.0, 'EU', 0),
('AT', 'Austria', 'VAT', 20.0, 'EU', 0),
('SE', 'Sweden', 'VAT', 25.0, 'EU', 0),
('DK', 'Denmark', 'VAT', 25.0, 'EU', 0),
('FI', 'Finland', 'VAT', 24.0, 'EU', 0),
('IE', 'Ireland', 'VAT', 23.0, 'EU', 0),
('PT', 'Portugal', 'VAT', 23.0, 'EU', 0),
('PL', 'Poland', 'VAT', 23.0, 'EU', 0),
('HU', 'Hungary', 'VAT', 27.0, 'EU', 0),
('LU', 'Luxembourg', 'VAT', 17.0, 'EU', 0),
('NG', 'Nigeria', 'VAT', 7.5, 'ECOWAS', 5.0),
('GH', 'Ghana', 'VAT', 15.0, 'ECOWAS', 5.0),
('KE', 'Kenya', 'VAT', 16.0, 'EAC', 4.0),
('TZ', 'Tanzania', 'VAT', 18.0, 'EAC', 4.0),
('UG', 'Uganda', 'VAT', 18.0, 'EAC', 4.0),
('ZA', 'South Africa', 'VAT', 15.0, 'SACU', 3.0),
('AE', 'United Arab Emirates', 'VAT', 5.0, 'GCC', 5.0),
('SA', 'Saudi Arabia', 'VAT', 15.0, 'GCC', 5.0),
('IN', 'India', 'GST', 18.0, NULL, 7.5),
('AU', 'Australia', 'GST', 10.0, NULL, 5.0),
('CA', 'Canada', 'GST', 5.0, 'USMCA', 3.5),
('MX', 'Mexico', 'VAT', 16.0, 'USMCA', 3.5),
('JP', 'Japan', 'Consumption Tax', 10.0, NULL, 4.0),
('CN', 'China', 'VAT', 13.0, NULL, 8.0),
('BR', 'Brazil', 'ICMS', 17.0, 'MERCOSUR', 6.0),
('SG', 'Singapore', 'GST', 9.0, 'ASEAN', 0),
('RW', 'Rwanda', 'VAT', 18.0, 'EAC', 4.0),
('ET', 'Ethiopia', 'VAT', 15.0, NULL, 5.0),
('EG', 'Egypt', 'VAT', 14.0, NULL, 5.0),
('MA', 'Morocco', 'VAT', 20.0, NULL, 5.0)
ON CONFLICT (country_code) DO NOTHING;
