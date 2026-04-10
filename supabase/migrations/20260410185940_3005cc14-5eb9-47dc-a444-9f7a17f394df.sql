-- Fix function search path warnings for financing order triggers

-- Update timestamp function with fixed search path
CREATE OR REPLACE FUNCTION update_financing_order_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Update event logging function with fixed search path
CREATE OR REPLACE FUNCTION log_financing_order_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO financing_order_events (financing_order_id, event_type, event_data, created_by)
        VALUES (
            NEW.id,
            NEW.status,
            jsonb_build_object(
                'previous_status', OLD.status,
                'new_status', NEW.status,
                'principal_amount', NEW.principal_amount,
                'timestamp', now()
            ),
            COALESCE(NEW.disbursed_by, NEW.lender_id)
        );
    END IF;
    RETURN NEW;
END;
$$;
