
-- 1. Add 'lender' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'lender';

-- 2. Lender Profiles
CREATE TABLE public.lender_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  institution_name TEXT NOT NULL,
  lending_license_number TEXT,
  license_jurisdiction TEXT,
  operating_regions TEXT[] DEFAULT '{}',
  facility_limit NUMERIC,
  sector_focus TEXT[] DEFAULT '{}',
  logo_url TEXT,
  institution_type TEXT NOT NULL DEFAULT 'private_lender',
  website_url TEXT,
  social_links JSONB DEFAULT '{}',
  bio TEXT,
  kyb_status TEXT NOT NULL DEFAULT 'pending',
  is_verified BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  terms_template JSONB,
  lender_tier INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lender_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lenders manage own profile"
  ON public.lender_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Vendors view verified lenders"
  ON public.lender_profiles FOR SELECT
  USING (is_verified = true AND public.has_role(auth.uid(), 'vendor'));

CREATE POLICY "Buyers view verified lenders"
  ON public.lender_profiles FOR SELECT
  USING (is_verified = true AND public.has_role(auth.uid(), 'buyer'));

CREATE POLICY "Admins view all lender profiles"
  ON public.lender_profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_lender_profiles_updated_at
  BEFORE UPDATE ON public.lender_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Financing Applications
CREATE TABLE public.financing_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL,
  lender_id UUID NOT NULL,
  certificate_id UUID,
  transaction_id UUID,
  requested_amount NUMERIC NOT NULL DEFAULT 0,
  approved_amount NUMERIC,
  proposed_terms JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  lender_notes TEXT,
  vendor_notes TEXT,
  lender_decision_note TEXT,
  industry TEXT,
  trade_scope TEXT,
  decision_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.financing_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors manage own financing apps"
  ON public.financing_applications FOR ALL
  USING (auth.uid() = vendor_id)
  WITH CHECK (auth.uid() = vendor_id);

CREATE POLICY "Lenders view assigned apps"
  ON public.financing_applications FOR SELECT
  USING (auth.uid() = lender_id);

CREATE POLICY "Lenders update assigned apps"
  ON public.financing_applications FOR UPDATE
  USING (auth.uid() = lender_id);

CREATE POLICY "Admins view all financing apps"
  ON public.financing_applications FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_financing_applications_updated_at
  BEFORE UPDATE ON public.financing_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_financing_apps_vendor ON public.financing_applications(vendor_id);
CREATE INDEX idx_financing_apps_lender ON public.financing_applications(lender_id);
CREATE INDEX idx_financing_apps_status ON public.financing_applications(status);

-- 4. Financing Application Items (Itemized Breakdown)
CREATE TABLE public.financing_application_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.financing_applications(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price_usd NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'goods',
  tax_amount NUMERIC DEFAULT 0,
  local_currency_code TEXT,
  local_currency_amount NUMERIC,
  exchange_rate_snapshot NUMERIC,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.financing_application_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors manage own app items"
  ON public.financing_application_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.financing_applications fa
    WHERE fa.id = application_id AND fa.vendor_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.financing_applications fa
    WHERE fa.id = application_id AND fa.vendor_id = auth.uid()
  ));

CREATE POLICY "Lenders view assigned app items"
  ON public.financing_application_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.financing_applications fa
    WHERE fa.id = application_id AND fa.lender_id = auth.uid()
  ));

CREATE POLICY "Admins view all app items"
  ON public.financing_application_items FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_financing_app_items_updated_at
  BEFORE UPDATE ON public.financing_application_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Financing Application Documents
CREATE TABLE public.financing_application_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.financing_applications(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.financing_application_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors manage own app docs"
  ON public.financing_application_documents FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.financing_applications fa
    WHERE fa.id = application_id AND fa.vendor_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.financing_applications fa
    WHERE fa.id = application_id AND fa.vendor_id = auth.uid()
  ));

CREATE POLICY "Lenders view assigned app docs"
  ON public.financing_application_documents FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.financing_applications fa
    WHERE fa.id = application_id AND fa.lender_id = auth.uid()
  ));

CREATE POLICY "Admins view all app docs"
  ON public.financing_application_documents FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. Lender KYB Queue
CREATE TABLE public.lender_kyb_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lender_id UUID NOT NULL,
  submitted_documents JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by TEXT,
  review_notes TEXT,
  approved_tier INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lender_kyb_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lenders manage own KYB"
  ON public.lender_kyb_queue FOR ALL
  USING (auth.uid() = lender_id)
  WITH CHECK (auth.uid() = lender_id);

CREATE POLICY "Admins manage all KYB"
  ON public.lender_kyb_queue FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_lender_kyb_updated_at
  BEFORE UPDATE ON public.lender_kyb_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Lender Disbursement Records (Auto + Manual)
CREATE TABLE public.lender_disbursement_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lender_id UUID NOT NULL,
  application_id UUID REFERENCES public.financing_applications(id),
  vendor_id UUID,
  amount_usd NUMERIC NOT NULL,
  local_currency_code TEXT,
  local_currency_amount NUMERIC,
  source TEXT NOT NULL DEFAULT 'auto',
  status TEXT NOT NULL DEFAULT 'confirmed',
  notes TEXT,
  disbursed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lender_disbursement_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lenders manage own disbursements"
  ON public.lender_disbursement_records FOR ALL
  USING (auth.uid() = lender_id)
  WITH CHECK (auth.uid() = lender_id);

CREATE POLICY "Admins view all disbursements"
  ON public.lender_disbursement_records FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_disbursement_records_updated_at
  BEFORE UPDATE ON public.lender_disbursement_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_disbursements_lender ON public.lender_disbursement_records(lender_id);
CREATE INDEX idx_disbursements_vendor ON public.lender_disbursement_records(vendor_id);

-- 8. Add website_url and social_links to profiles (for vendor requirement)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';

-- 9. Storage bucket for lender assets
INSERT INTO storage.buckets (id, name, public) VALUES ('lender-assets', 'lender-assets', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Lenders upload own assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'lender-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Lenders view own assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lender-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Lenders update own assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'lender-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Lenders delete own assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'lender-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 10. Storage bucket for financing application documents
INSERT INTO storage.buckets (id, name, public) VALUES ('financing-documents', 'financing-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload financing docs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'financing-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users view own financing docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'financing-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own financing docs"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'financing-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 11. Auto-disbursement trigger on financing application approval
CREATE OR REPLACE FUNCTION public.auto_log_lender_disbursement()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'approved')) THEN
    INSERT INTO public.lender_disbursement_records (lender_id, application_id, vendor_id, amount_usd, source, status)
    VALUES (
      NEW.lender_id,
      NEW.id,
      NEW.vendor_id,
      COALESCE(NEW.approved_amount, NEW.requested_amount),
      'auto',
      'confirmed'
    );

    -- Notify vendor of approval
    INSERT INTO public.notifications (user_id, title, message, type, related_entity_type, related_entity_id)
    VALUES (
      NEW.vendor_id,
      '✅ Financing Application Approved',
      'Your financing application for $' || COALESCE(NEW.approved_amount, NEW.requested_amount)::text || ' has been approved.',
      'success',
      'financing_application',
      NEW.id::text
    );
  END IF;

  -- Notify on rejection
  IF NEW.status = 'rejected' AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'rejected')) THEN
    INSERT INTO public.notifications (user_id, title, message, type, related_entity_type, related_entity_id)
    VALUES (
      NEW.vendor_id,
      '❌ Financing Application Rejected',
      'Your financing application has been rejected. Reason: ' || COALESCE(NEW.lender_decision_note, 'No reason provided.'),
      'warning',
      'financing_application',
      NEW.id::text
    );
  END IF;

  -- Notify on return for revision
  IF NEW.status = 'returned' AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'returned')) THEN
    INSERT INTO public.notifications (user_id, title, message, type, is_action_required, related_entity_type, related_entity_id)
    VALUES (
      NEW.vendor_id,
      '🔄 Application Returned for Revision',
      'Your financing application has been returned for updates. Note: ' || COALESCE(NEW.lender_decision_note, 'Please review and resubmit.'),
      'info',
      true,
      'financing_application',
      NEW.id::text
    );
  END IF;

  -- Notify lender on submission/resubmission
  IF NEW.status = 'submitted' AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'submitted')) THEN
    INSERT INTO public.notifications (user_id, title, message, type, is_action_required, related_entity_type, related_entity_id)
    VALUES (
      NEW.lender_id,
      '📋 New Financing Application',
      'A vendor has submitted a financing application for $' || NEW.requested_amount::text || '. Review it in your Applications panel.',
      'info',
      true,
      'financing_application',
      NEW.id::text
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_financing_app_status_change
  AFTER INSERT OR UPDATE ON public.financing_applications
  FOR EACH ROW EXECUTE FUNCTION public.auto_log_lender_disbursement();
