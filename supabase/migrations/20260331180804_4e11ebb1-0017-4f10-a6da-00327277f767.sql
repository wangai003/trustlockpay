
-- 1. milestone_negotiations table
CREATE TABLE public.milestone_negotiations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  drafted_by text NOT NULL CHECK (drafted_by IN ('buyer','vendor')),
  milestones jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'drafting' CHECK (status IN ('drafting','proposed','agreed','amendment_requested')),
  change_notes text,
  proposed_at timestamptz,
  agreed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.milestone_negotiations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Transaction parties read milestone negotiations"
  ON public.milestone_negotiations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = milestone_negotiations.transaction_id
        AND (t.buyer_id = auth.uid() OR t.vendor_id = auth.uid())
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Transaction parties insert milestone negotiations"
  ON public.milestone_negotiations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = milestone_negotiations.transaction_id
        AND (t.buyer_id = auth.uid() OR t.vendor_id = auth.uid())
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Transaction parties update milestone negotiations"
  ON public.milestone_negotiations FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = milestone_negotiations.transaction_id
        AND (t.buyer_id = auth.uid() OR t.vendor_id = auth.uid())
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- 2. vendor_settings additions
ALTER TABLE public.vendor_settings
  ADD COLUMN industry_category text,
  ADD COLUMN transaction_types text[] NOT NULL DEFAULT '{simple}',
  ADD COLUMN shipping_api_provider text,
  ADD COLUMN shipping_api_key_encrypted text,
  ADD COLUMN auto_milestone_template boolean NOT NULL DEFAULT false;

-- 3. seed_tokens — wallet_purpose
ALTER TABLE public.seed_tokens
  ADD COLUMN wallet_purpose text NOT NULL DEFAULT 'payout' CHECK (wallet_purpose IN ('pay','payout'));

-- 4. payout_requests additions
ALTER TABLE public.payout_requests
  ADD COLUMN trickle_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN trickle_rule text NOT NULL DEFAULT 'none' CHECK (trickle_rule IN ('none','full_escrow_fee','vendor_share_only')),
  ADD COLUMN escrow_fee_deducted numeric NOT NULL DEFAULT 0;

-- 5. transactions — order_type
ALTER TABLE public.transactions
  ADD COLUMN order_type text NOT NULL DEFAULT 'simple' CHECK (order_type IN ('simple','milestone','hybrid'));

-- 6. order_carbon_copies additions
ALTER TABLE public.order_carbon_copies
  ADD COLUMN signup_link text,
  ADD COLUMN login_link text;

-- 7. Enable realtime on milestone_negotiations
ALTER PUBLICATION supabase_realtime ADD TABLE public.milestone_negotiations;
