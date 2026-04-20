CREATE TABLE public.deployment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  network TEXT NOT NULL CHECK (network IN ('amoy', 'polygon')),
  contract_name TEXT NOT NULL,
  contract_address TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  block_number BIGINT,
  deployer_address TEXT NOT NULL,
  gas_used TEXT,
  constructor_args JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'deployed',
  verification_status TEXT DEFAULT 'pending',
  verification_url TEXT,
  initiated_by_admin_id UUID REFERENCES public.admin_accounts(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_deployment_history_network ON public.deployment_history(network);
CREATE INDEX idx_deployment_history_created_at ON public.deployment_history(created_at DESC);
CREATE INDEX idx_deployment_history_contract_name ON public.deployment_history(contract_name);

ALTER TABLE public.deployment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view deployment history"
ON public.deployment_history
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- No INSERT/UPDATE/DELETE policies for authenticated users.
-- Inserts happen via service_role from the deploy-contracts edge function.