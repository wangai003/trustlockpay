
-- Add phone and response tracking fields to rfq_requests
ALTER TABLE public.rfq_requests
  ADD COLUMN IF NOT EXISTS buyer_phone_1 text,
  ADD COLUMN IF NOT EXISTS buyer_country_code_1 text DEFAULT '+1',
  ADD COLUMN IF NOT EXISTS buyer_phone_2 text,
  ADD COLUMN IF NOT EXISTS buyer_country_code_2 text,
  ADD COLUMN IF NOT EXISTS buyer_phone_3 text,
  ADD COLUMN IF NOT EXISTS buyer_country_code_3 text,
  ADD COLUMN IF NOT EXISTS rfq_label text DEFAULT 'Request for Quote',
  ADD COLUMN IF NOT EXISTS standalone_link_id uuid,
  ADD COLUMN IF NOT EXISTS customer_response text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS customer_response_at timestamptz;

-- Add vendor contact fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_phone text,
  ADD COLUMN IF NOT EXISTS business_email text,
  ADD COLUMN IF NOT EXISTS business_phone_country_code text DEFAULT '+1';

-- RLS: anyone can insert an RFQ (public checkout scenario)
CREATE POLICY "Anyone can submit RFQ" ON public.rfq_requests
  FOR INSERT WITH CHECK (true);

-- RLS: vendors can view RFQs sent to them
CREATE POLICY "Vendors can view their RFQs" ON public.rfq_requests
  FOR SELECT USING (vendor_id = auth.uid());

-- RLS: authenticated users can view RFQs they submitted
CREATE POLICY "Buyers can view own RFQs" ON public.rfq_requests
  FOR SELECT USING (buyer_id = auth.uid());

-- RLS: vendors can update RFQ status (respond)
CREATE POLICY "Vendors can update their RFQs" ON public.rfq_requests
  FOR UPDATE USING (vendor_id = auth.uid());

-- Index for vendor CRM queries
CREATE INDEX IF NOT EXISTS idx_rfq_requests_vendor_id ON public.rfq_requests(vendor_id);
CREATE INDEX IF NOT EXISTS idx_rfq_requests_status ON public.rfq_requests(status);
