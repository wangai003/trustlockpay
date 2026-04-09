
CREATE TABLE public.vendor_document_vault (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  vault_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size TEXT,
  category TEXT DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_document_vault ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can view own vault docs"
  ON public.vendor_document_vault FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Vendors can insert own vault docs"
  ON public.vendor_document_vault FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Vendors can update own vault docs"
  ON public.vendor_document_vault FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Vendors can delete own vault docs"
  ON public.vendor_document_vault FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_vendor_document_vault_updated_at
  BEFORE UPDATE ON public.vendor_document_vault
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_vendor_document_vault_user ON public.vendor_document_vault(user_id);
