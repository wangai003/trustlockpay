ALTER TABLE public.transaction_milestones
  ADD COLUMN IF NOT EXISTS gps_address text,
  ADD COLUMN IF NOT EXISTS gps_city text,
  ADD COLUMN IF NOT EXISTS gps_country text;