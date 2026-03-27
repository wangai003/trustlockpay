
CREATE TABLE public.standalone_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id text NOT NULL UNIQUE,
  vendor_id uuid NOT NULL,
  vendor_name text,
  title text NOT NULL,
  invoice_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  tax_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  note text DEFAULT '',
  subtotal numeric NOT NULL DEFAULT 0,
  tax_total numeric NOT NULL DEFAULT 0,
  grand_total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  industry text DEFAULT 'default',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.standalone_links ENABLE ROW LEVEL SECURITY;

-- Vendors can create their own links
CREATE POLICY "Vendors insert own links"
  ON public.standalone_links FOR INSERT
  TO authenticated
  WITH CHECK (vendor_id = auth.uid());

-- Vendors can update own links
CREATE POLICY "Vendors update own links"
  ON public.standalone_links FOR UPDATE
  TO authenticated
  USING (vendor_id = auth.uid());

-- Vendors read own links
CREATE POLICY "Vendors read own links"
  ON public.standalone_links FOR SELECT
  TO authenticated
  USING (vendor_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- Public can read by link_id (for checkout)
CREATE POLICY "Public read links by id"
  ON public.standalone_links FOR SELECT
  TO anon
  USING (true);
