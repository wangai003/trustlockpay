
-- 1. Create protection_documents table
CREATE TABLE public.protection_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL,
  title text NOT NULL,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  user_id uuid,
  role text,
  industry text,
  signed_by_buyer text,
  signed_by_vendor text,
  metadata jsonb DEFAULT '{}'::jsonb,
  retention_years integer DEFAULT 7,
  created_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz DEFAULT now(),
  is_archived boolean DEFAULT true
);

-- 2. Enable RLS
ALTER TABLE public.protection_documents ENABLE ROW LEVEL SECURITY;

-- Users can read own documents
CREATE POLICY "Users read own protection docs"
  ON public.protection_documents FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins have full access
CREATE POLICY "Admins manage all protection docs"
  ON public.protection_documents FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can insert
CREATE POLICY "Auth insert protection docs"
  ON public.protection_documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Transaction parties can read
CREATE POLICY "Transaction parties read protection docs"
  ON public.protection_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = protection_documents.transaction_id
        AND (t.buyer_id = auth.uid() OR t.vendor_id = auth.uid())
    )
  );

-- 3. Create storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('protection-documents', 'protection-documents', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can upload
CREATE POLICY "Auth upload protection docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'protection-documents');

-- Storage RLS: authenticated users can read own or admin
CREATE POLICY "Auth read protection docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'protection-documents');
