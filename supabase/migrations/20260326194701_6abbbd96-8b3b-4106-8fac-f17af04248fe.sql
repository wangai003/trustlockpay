
CREATE TABLE public.payout_field_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  country_name text NOT NULL,
  payout_method text NOT NULL DEFAULT 'bank_transfer',
  required_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  provider text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(country_code, payout_method)
);

ALTER TABLE public.payout_field_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read payout field configs"
ON public.payout_field_configs
FOR SELECT TO anon, authenticated
USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.payout_field_configs;

CREATE INDEX idx_payout_fields_country ON public.payout_field_configs(country_code);

-- Seed: US/UK/EU bank transfers
INSERT INTO public.payout_field_configs (country_code, country_name, payout_method, provider, required_fields) VALUES
('US', 'United States', 'bank_transfer', 'stripe', '[
  {"field_name":"account_holder","label":"Account Holder Name","type":"text","placeholder":"John Doe","validation_regex":"^.{2,100}$","is_required":true},
  {"field_name":"account_number","label":"Account Number","type":"text","placeholder":"1234567890","validation_regex":"^[0-9]{8,17}$","is_required":true},
  {"field_name":"routing_number","label":"Routing Number (ABA)","type":"text","placeholder":"021000021","validation_regex":"^[0-9]{9}$","is_required":true},
  {"field_name":"account_type","label":"Account Type","type":"select","placeholder":"Checking","validation_regex":"^(checking|savings)$","is_required":true}
]'::jsonb),
('GB', 'United Kingdom', 'bank_transfer', 'stripe', '[
  {"field_name":"account_holder","label":"Account Holder Name","type":"text","placeholder":"Jane Smith","validation_regex":"^.{2,100}$","is_required":true},
  {"field_name":"sort_code","label":"Sort Code","type":"text","placeholder":"20-00-00","validation_regex":"^[0-9]{2}-?[0-9]{2}-?[0-9]{2}$","is_required":true},
  {"field_name":"account_number","label":"Account Number","type":"text","placeholder":"12345678","validation_regex":"^[0-9]{8}$","is_required":true},
  {"field_name":"swift_bic","label":"SWIFT/BIC","type":"text","placeholder":"BUKBGB22","validation_regex":"^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$","is_required":false}
]'::jsonb),
('EU', 'European Union', 'bank_transfer', 'stripe', '[
  {"field_name":"account_holder","label":"Account Holder Name","type":"text","placeholder":"Hans Mueller","validation_regex":"^.{2,100}$","is_required":true},
  {"field_name":"iban","label":"IBAN","type":"text","placeholder":"DE89370400440532013000","validation_regex":"^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$","is_required":true},
  {"field_name":"swift_bic","label":"SWIFT/BIC","type":"text","placeholder":"COBADEFFXXX","validation_regex":"^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$","is_required":true}
]'::jsonb),

-- Nigeria bank
('NG', 'Nigeria', 'bank_transfer', 'yellow_card', '[
  {"field_name":"account_name","label":"Account Name","type":"text","placeholder":"Adebayo Ogunlesi","validation_regex":"^.{2,100}$","is_required":true},
  {"field_name":"account_number","label":"Account Number (NUBAN)","type":"text","placeholder":"0123456789","validation_regex":"^[0-9]{10}$","is_required":true},
  {"field_name":"bank_name","label":"Bank Name","type":"select","placeholder":"Select bank","validation_regex":"^.{2,50}$","is_required":true},
  {"field_name":"bank_code","label":"Bank Code","type":"text","placeholder":"058","validation_regex":"^[0-9]{3}$","is_required":true},
  {"field_name":"bvn","label":"BVN (Bank Verification Number)","type":"text","placeholder":"22212345678","validation_regex":"^[0-9]{11}$","is_required":false}
]'::jsonb),

-- Kenya M-Pesa
('KE', 'Kenya', 'mobile_money', 'yellow_card', '[
  {"field_name":"phone_number","label":"M-Pesa Phone Number","type":"tel","placeholder":"+254712345678","validation_regex":"^\\+?254[17][0-9]{8}$","is_required":true},
  {"field_name":"registered_name","label":"Registered Name","type":"text","placeholder":"Wanjiku Kamau","validation_regex":"^.{2,100}$","is_required":true}
]'::jsonb),
('KE', 'Kenya', 'bank_transfer', 'yellow_card', '[
  {"field_name":"account_holder","label":"Account Holder Name","type":"text","placeholder":"Wanjiku Kamau","validation_regex":"^.{2,100}$","is_required":true},
  {"field_name":"account_number","label":"Account Number","type":"text","placeholder":"1234567890123","validation_regex":"^[0-9]{10,14}$","is_required":true},
  {"field_name":"bank_name","label":"Bank Name","type":"select","placeholder":"Select bank","validation_regex":"^.{2,50}$","is_required":true},
  {"field_name":"branch_code","label":"Branch Code","type":"text","placeholder":"001","validation_regex":"^[0-9]{3}$","is_required":true}
]'::jsonb),

-- Ghana Mobile Money
('GH', 'Ghana', 'mobile_money', 'yellow_card', '[
  {"field_name":"phone_number","label":"Mobile Money Number","type":"tel","placeholder":"+233241234567","validation_regex":"^\\+?233[235][0-9]{7,8}$","is_required":true},
  {"field_name":"network","label":"Network","type":"select","placeholder":"Select network","validation_regex":"^(MTN|Vodafone|AirtelTigo)$","is_required":true},
  {"field_name":"registered_name","label":"Registered Name","type":"text","placeholder":"Kwame Asante","validation_regex":"^.{2,100}$","is_required":true}
]'::jsonb),

-- South Africa bank
('ZA', 'South Africa', 'bank_transfer', 'yellow_card', '[
  {"field_name":"account_holder","label":"Account Holder Name","type":"text","placeholder":"Thabo Mbeki","validation_regex":"^.{2,100}$","is_required":true},
  {"field_name":"account_number","label":"Account Number","type":"text","placeholder":"62000000001","validation_regex":"^[0-9]{9,12}$","is_required":true},
  {"field_name":"bank_name","label":"Bank Name","type":"select","placeholder":"Select bank","validation_regex":"^.{2,50}$","is_required":true},
  {"field_name":"branch_code","label":"Universal Branch Code","type":"text","placeholder":"250655","validation_regex":"^[0-9]{6}$","is_required":true},
  {"field_name":"swift_bic","label":"SWIFT Code","type":"text","placeholder":"FIABORJJ","validation_regex":"^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$","is_required":false},
  {"field_name":"id_number","label":"SA ID Number","type":"text","placeholder":"8501015009087","validation_regex":"^[0-9]{13}$","is_required":false}
]'::jsonb),

-- Universal Crypto
('GLOBAL', 'Global', 'crypto', 'direct', '[
  {"field_name":"wallet_address","label":"Wallet Address","type":"text","placeholder":"0x1234...abcd","validation_regex":"^0x[a-fA-F0-9]{40}$","is_required":true},
  {"field_name":"network","label":"Network","type":"select","placeholder":"Select network","validation_regex":"^(Polygon|Ethereum|BSC|Arbitrum|Base)$","is_required":true}
]'::jsonb),

-- UAE bank
('AE', 'United Arab Emirates', 'bank_transfer', 'coinbase', '[
  {"field_name":"account_holder","label":"Account Holder Name","type":"text","placeholder":"Ahmed Al Maktoum","validation_regex":"^.{2,100}$","is_required":true},
  {"field_name":"iban","label":"IBAN","type":"text","placeholder":"AE070331234567890123456","validation_regex":"^AE[0-9]{21}$","is_required":true},
  {"field_name":"swift_bic","label":"SWIFT/BIC","type":"text","placeholder":"EABORJJ","validation_regex":"^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$","is_required":true},
  {"field_name":"bank_name","label":"Bank Name","type":"text","placeholder":"Emirates NBD","validation_regex":"^.{2,50}$","is_required":true}
]'::jsonb)
ON CONFLICT (country_code, payout_method) DO NOTHING;
