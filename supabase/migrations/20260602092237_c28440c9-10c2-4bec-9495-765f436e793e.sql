
CREATE OR REPLACE FUNCTION public.auto_generate_lender_certificate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_buyer_email text;
  v_milestones jsonb;
BEGIN
  IF NEW.status = 'locked' AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'locked')) THEN
    IF NEW.vendor_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.lender_certificates
      WHERE transaction_id = NEW.id AND status = 'active'
    ) THEN
      SELECT email INTO v_buyer_email FROM public.profiles WHERE id = NEW.buyer_id;
      SELECT COALESCE(jsonb_agg(m ORDER BY m->>'sequence'), '[]'::jsonb)
        INTO v_milestones
        FROM public.transaction_milestones tm,
             LATERAL to_jsonb(tm) m
       WHERE tm.transaction_id = NEW.id;

      INSERT INTO public.lender_certificates (transaction_id, vendor_id, certificate_metadata)
      VALUES (
        NEW.id,
        NEW.vendor_id,
        jsonb_build_object(
          'auto_generated', true,
          'tx_id', NEW.tx_id,
          'amount', NEW.amount,
          'buyer_name', COALESCE(NEW.buyer_name, 'Unknown'),
          'buyer_email', COALESCE(v_buyer_email, ''),
          'vendor_name', COALESCE(NEW.vendor_name, 'Unknown'),
          'industry', NEW.industry,
          'milestones', COALESCE(v_milestones, '[]'::jsonb)
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
