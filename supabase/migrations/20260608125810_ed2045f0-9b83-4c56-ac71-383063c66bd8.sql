
CREATE TABLE public.transaction_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL,
  buyer_id uuid,
  storage_path text,
  original_filename text,
  mime_type text,
  file_size_bytes bigint,
  external_url text,
  notes text,
  released_to_buyer boolean NOT NULL DEFAULT false,
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transaction_deliverables TO authenticated;
GRANT ALL ON public.transaction_deliverables TO service_role;

ALTER TABLE public.transaction_deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendor manages own deliverables"
  ON public.transaction_deliverables
  FOR ALL
  TO authenticated
  USING (auth.uid() = vendor_id)
  WITH CHECK (auth.uid() = vendor_id);

CREATE POLICY "Buyer reads own order deliverables"
  ON public.transaction_deliverables
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = buyer_id
    OR EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_deliverables.transaction_id
        AND t.buyer_id = auth.uid()
    )
  );

CREATE INDEX idx_transaction_deliverables_tx ON public.transaction_deliverables(transaction_id);
CREATE INDEX idx_transaction_deliverables_vendor ON public.transaction_deliverables(vendor_id);

CREATE TRIGGER trg_transaction_deliverables_updated_at
  BEFORE UPDATE ON public.transaction_deliverables
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-flip released_to_buyer when parent transaction is released
CREATE OR REPLACE FUNCTION public.auto_release_deliverables()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'released' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'released') THEN
    UPDATE public.transaction_deliverables
       SET released_to_buyer = true,
           released_at = COALESCE(released_at, now()),
           updated_at = now()
     WHERE transaction_id = NEW.id
       AND released_to_buyer = false;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_release_deliverables
  AFTER INSERT OR UPDATE OF status ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_release_deliverables();
