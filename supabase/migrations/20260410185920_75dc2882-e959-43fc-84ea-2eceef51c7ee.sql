-- Phase 6: Escrow-Lending Bridge Infrastructure

-- Create financing_orders table (links approved financing to escrow)
CREATE TABLE IF NOT EXISTS financing_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id uuid REFERENCES financing_applications(id) ON DELETE CASCADE,
    lender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    vendor_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
    
    -- Financing terms (copied from approved application)
    principal_amount numeric(15,2) NOT NULL,
    interest_rate_percent numeric(5,2) NOT NULL,
    tenure_days integer NOT NULL,
    
    -- Status tracking
    status text DEFAULT 'pending_disbursement' CHECK (status IN ('pending_disbursement', 'disbursed', 'repaid', 'defaulted', 'cancelled')),
    
    -- Disbursement tracking
    disbursed_at timestamptz,
    disbursed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    disbursement_tx_hash text, -- Blockchain anchor
    
    -- Repayment tracking
    repaid_at timestamptz,
    repayment_amount numeric(15,2),
    repayment_tx_hash text,
    
    -- Calculated fields
    maturity_date date NOT NULL,
    expected_repayment_amount numeric(15,2) GENERATED ALWAYS AS (
        principal_amount + (principal_amount * interest_rate_percent / 100 * tenure_days / 365)
    ) STORED,
    
    -- Timestamps
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE financing_orders ENABLE ROW LEVEL SECURITY;

-- Policies: Lenders can view their own financing orders
CREATE POLICY "Lenders can view their financing orders"
  ON financing_orders FOR SELECT
  TO authenticated
  USING (lender_id = auth.uid());

-- Policies: Vendors can view their financing orders
CREATE POLICY "Vendors can view their financing orders"
  ON financing_orders FOR SELECT
  TO authenticated
  USING (vendor_id = auth.uid());

-- Policies: System can manage orders
CREATE POLICY "System can manage financing orders"
  ON financing_orders FOR ALL
  TO authenticated
  WITH CHECK (true);

-- Add financing_id to transactions table for linkage
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS financing_order_id uuid;
ALTER TABLE transactions 
  ADD CONSTRAINT fk_transactions_financing_order 
  FOREIGN KEY (financing_order_id) REFERENCES financing_orders(id) ON DELETE SET NULL;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_financing_orders_lender ON financing_orders(lender_id);
CREATE INDEX IF NOT EXISTS idx_financing_orders_vendor ON financing_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_financing_orders_status ON financing_orders(status);
CREATE INDEX IF NOT EXISTS idx_financing_orders_maturity ON financing_orders(maturity_date) WHERE status = 'disbursed';
CREATE INDEX IF NOT EXISTS idx_transactions_financing ON transactions(financing_order_id) WHERE financing_order_id IS NOT NULL;

-- Create financing_order_events table for audit trail
CREATE TABLE IF NOT EXISTS financing_order_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    financing_order_id uuid REFERENCES financing_orders(id) ON DELETE CASCADE,
    event_type text NOT NULL CHECK (event_type IN ('created', 'disbursed', 'repaid', 'defaulted', 'cancelled', 'extended')),
    event_data jsonb,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS on events
ALTER TABLE financing_order_events ENABLE ROW LEVEL SECURITY;

-- Policies: Participants can view events for their orders
CREATE POLICY "Lenders can view order events"
  ON financing_order_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM financing_orders fo
      WHERE fo.id = financing_order_events.financing_order_id
      AND fo.lender_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can view order events"
  ON financing_order_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM financing_orders fo
      WHERE fo.id = financing_order_events.financing_order_id
      AND fo.vendor_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_financing_order_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS trg_financing_orders_updated_at ON financing_orders;
CREATE TRIGGER trg_financing_orders_updated_at
    BEFORE UPDATE ON financing_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_financing_order_updated_at();

-- Create function to auto-create event on status change
CREATE OR REPLACE FUNCTION log_financing_order_event()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger for event logging
DROP TRIGGER IF EXISTS trg_financing_order_events ON financing_orders;
CREATE TRIGGER trg_financing_order_events
    AFTER UPDATE ON financing_orders
    FOR EACH ROW
    EXECUTE FUNCTION log_financing_order_event();
