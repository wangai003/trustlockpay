-- Remove sensitive tables from realtime publication (correct syntax without IF EXISTS)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.transaction_observers;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.acknowledgement_forms;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
END $$;

-- 5. RFQ: restrict vendor reads to exclude buyer email  
DROP POLICY IF EXISTS "Vendors read own RFQs" ON public.rfq_requests;

CREATE POLICY "Vendors read own RFQs safe"
ON public.rfq_requests
FOR SELECT
TO authenticated
USING (
  vendor_id = auth.uid()
  OR buyer_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);