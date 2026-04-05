-- Milestone counter-proposals from buyers during checkout
CREATE TABLE public.milestone_counter_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_number TEXT NOT NULL DEFAULT ('MCP-' || substr(gen_random_uuid()::text, 1, 8)),
  vendor_id UUID NOT NULL,
  site_id TEXT,
  industry TEXT,
  order_item TEXT,
  order_amount NUMERIC DEFAULT 0,
  buyer_full_name TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  buyer_phone TEXT,
  buyer_country_code TEXT DEFAULT '+1',
  vendor_schedule JSONB NOT NULL DEFAULT '[]'::jsonb,
  proposed_schedule JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  vendor_notes TEXT,
  standalone_link_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.milestone_counter_proposals ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public checkout)
CREATE POLICY "Anyone can submit a counter-proposal"
ON public.milestone_counter_proposals
FOR INSERT
WITH CHECK (true);

-- Vendor can view their own proposals
CREATE POLICY "Vendors can view their proposals"
ON public.milestone_counter_proposals
FOR SELECT
TO authenticated
USING (vendor_id = auth.uid());

-- Vendor can update their own proposals
CREATE POLICY "Vendors can update their proposals"
ON public.milestone_counter_proposals
FOR UPDATE
TO authenticated
USING (vendor_id = auth.uid());

-- Admins can view all
CREATE POLICY "Admins can view all proposals"
ON public.milestone_counter_proposals
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE TRIGGER update_milestone_counter_proposals_updated_at
BEFORE UPDATE ON public.milestone_counter_proposals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();