
ALTER TABLE public.disputes
  ADD COLUMN IF NOT EXISTS arbitration_fee numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS arbitrator_id uuid,
  ADD COLUMN IF NOT EXISTS arbitration_ruling text,
  ADD COLUMN IF NOT EXISTS ruling_accepted_buyer boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ruling_accepted_vendor boolean DEFAULT false;
