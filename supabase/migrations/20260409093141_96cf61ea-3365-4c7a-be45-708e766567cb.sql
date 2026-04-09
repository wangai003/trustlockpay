
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS transport_legs jsonb DEFAULT NULL;

COMMENT ON COLUMN public.transactions.transport_legs IS 'Structured multi-modal transport data: array of {mode, carrierName, trackingNumber, trackingUrl, vesselId, origin, destination, estimatedDelivery}';
