-- Risk score cache table
CREATE TABLE public.vendor_risk_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL,
  composite_score NUMERIC NOT NULL DEFAULT 0,
  risk_tier TEXT NOT NULL DEFAULT 'unrated',
  pillar_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  score_metadata JSONB DEFAULT '{}'::jsonb,
  computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(vendor_id)
);

ALTER TABLE public.vendor_risk_scores ENABLE ROW LEVEL SECURITY;

-- Lenders and the vendor themselves can view scores
CREATE POLICY "Lenders can view vendor risk scores"
  ON public.vendor_risk_scores FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'lender') OR
    vendor_id = auth.uid() OR
    public.has_role(auth.uid(), 'admin')
  );

-- Only system (via security definer function) can write
CREATE POLICY "System can manage risk scores"
  ON public.vendor_risk_scores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_vendor_risk_scores_vendor ON public.vendor_risk_scores(vendor_id);
CREATE INDEX idx_vendor_risk_scores_tier ON public.vendor_risk_scores(risk_tier);

-- The main scoring function
CREATE OR REPLACE FUNCTION public.compute_vendor_risk_score(_vendor_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  -- Pillar scores (0-100 each)
  _escrow_score NUMERIC := 50;
  _dispute_score NUMERIC := 80;
  _velocity_score NUMERIC := 50;
  _compliance_score NUMERIC := 50;
  _network_score NUMERIC := 50;

  -- Intermediate variables
  _total_tx INTEGER := 0;
  _completed_tx INTEGER := 0;
  _cancelled_tx INTEGER := 0;
  _refunded_tx INTEGER := 0;
  _avg_days_to_release NUMERIC := 0;
  _total_disputes INTEGER := 0;
  _vendor_favorable INTEGER := 0;
  _escalated INTEGER := 0;
  _tx_last_90 INTEGER := 0;
  _tx_prev_90 INTEGER := 0;
  _total_volume NUMERIC := 0;
  _unique_buyers INTEGER := 0;
  _repeat_buyers INTEGER := 0;
  _cross_border_tx INTEGER := 0;
  _kyc_status TEXT := 'not_submitted';
  _compliance_flags INTEGER := 0;
  _critical_flags INTEGER := 0;
  _has_business_kyc BOOLEAN := false;
  _composite NUMERIC := 0;
  _tier TEXT := 'unrated';
  _result JSONB;
BEGIN
  -- ═══════════════════════════════════════
  -- PILLAR 1: ESCROW PERFORMANCE (20%)
  -- ═══════════════════════════════════════
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status IN ('released', 'completed')),
    COUNT(*) FILTER (WHERE status = 'cancelled'),
    COUNT(*) FILTER (WHERE status = 'refunded'),
    COALESCE(AVG(
      CASE WHEN released_date IS NOT NULL AND created_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (released_date - created_at)) / 86400.0
        ELSE NULL END
    ), 0)
  INTO _total_tx, _completed_tx, _cancelled_tx, _refunded_tx, _avg_days_to_release
  FROM transactions
  WHERE vendor_id = _vendor_id;

  IF _total_tx > 0 THEN
    DECLARE
      _completion_rate NUMERIC := (_completed_tx::numeric / _total_tx) * 100;
      _cancel_rate NUMERIC := ((_cancelled_tx + _refunded_tx)::numeric / _total_tx) * 100;
      _days_score NUMERIC;
    BEGIN
      -- Completion rate: 60% weight
      -- Cancel/refund penalty: 20% weight
      -- Days-to-release efficiency: 20% weight
      _days_score := GREATEST(0, 100 - (_avg_days_to_release * 2)); -- 50 days = 0
      _escrow_score := LEAST(100, GREATEST(0,
        (_completion_rate * 0.6) +
        ((100 - _cancel_rate) * 0.2) +
        (_days_score * 0.2)
      ));
    END;
  END IF;

  -- ═══════════════════════════════════════
  -- PILLAR 2: DISPUTE PROFILE (20%)
  -- ═══════════════════════════════════════
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE resolution IN ('vendor_favorable', 'vendor_refund', 'split_vendor_majority')),
    COUNT(*) FILTER (WHERE status = 'arbitration' OR arbitrator_id IS NOT NULL)
  INTO _total_disputes, _vendor_favorable, _escalated
  FROM disputes
  WHERE vendor_id = _vendor_id;

  IF _total_tx > 0 THEN
    DECLARE
      _dispute_rate NUMERIC := (_total_disputes::numeric / GREATEST(_total_tx, 1)) * 100;
      _favorable_rate NUMERIC := CASE WHEN _total_disputes > 0
        THEN (_vendor_favorable::numeric / _total_disputes) * 100 ELSE 100 END;
      _escalation_rate NUMERIC := CASE WHEN _total_disputes > 0
        THEN (_escalated::numeric / _total_disputes) * 100 ELSE 0 END;
    BEGIN
      -- Low dispute rate: 50% weight (< 5% = 100, > 25% = 0)
      -- Favorable resolution: 30% weight
      -- Low escalation: 20% weight
      _dispute_score := LEAST(100, GREATEST(0,
        (GREATEST(0, 100 - (_dispute_rate * 4)) * 0.5) +
        (_favorable_rate * 0.3) +
        ((100 - _escalation_rate) * 0.2)
      ));
    END;
  END IF;

  -- ═══════════════════════════════════════
  -- PILLAR 3: VELOCITY & CONSISTENCY (20%)
  -- ═══════════════════════════════════════
  SELECT
    COUNT(*) FILTER (WHERE created_at >= now() - interval '90 days'),
    COUNT(*) FILTER (WHERE created_at >= now() - interval '180 days' AND created_at < now() - interval '90 days'),
    COALESCE(SUM(amount), 0)
  INTO _tx_last_90, _tx_prev_90, _total_volume
  FROM transactions
  WHERE vendor_id = _vendor_id;

  DECLARE
    _freq_score NUMERIC;
    _trend_score NUMERIC;
    _volume_score NUMERIC;
  BEGIN
    -- Frequency: more regular = higher (cap at 20 tx/quarter = 100)
    _freq_score := LEAST(100, (_tx_last_90::numeric / 20.0) * 100);

    -- Trend: growing or stable is good, declining is penalized
    IF _tx_prev_90 > 0 THEN
      _trend_score := LEAST(100, GREATEST(0,
        50 + ((_tx_last_90::numeric - _tx_prev_90) / _tx_prev_90) * 50
      ));
    ELSIF _tx_last_90 > 0 THEN
      _trend_score := 75; -- new but active
    ELSE
      _trend_score := 25; -- no recent activity
    END IF;

    -- Volume: $100K+ = 100
    _volume_score := LEAST(100, (_total_volume / 100000.0) * 100);

    _velocity_score := LEAST(100, GREATEST(0,
      (_freq_score * 0.4) + (_trend_score * 0.35) + (_volume_score * 0.25)
    ));
  END;

  -- ═══════════════════════════════════════
  -- PILLAR 4: COMPLIANCE STANDING (20%)
  -- ═══════════════════════════════════════
  SELECT COALESCE(status, 'not_submitted')
  INTO _kyc_status
  FROM kyc_queue
  WHERE vendor_id = _vendor_id
  ORDER BY submitted_at DESC NULLS LAST
  LIMIT 1;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE severity = 'critical')
  INTO _compliance_flags, _critical_flags
  FROM compliance_flags
  WHERE related_vendor_id = _vendor_id::text;

  SELECT EXISTS(
    SELECT 1 FROM business_kyc_profiles
    WHERE user_id = _vendor_id AND verification_status = 'approved'
  ) INTO _has_business_kyc;

  DECLARE
    _kyc_score NUMERIC;
    _flag_penalty NUMERIC;
    _bkyc_bonus NUMERIC;
  BEGIN
    _kyc_score := CASE _kyc_status
      WHEN 'approved' THEN 80
      WHEN 'submitted' THEN 50
      WHEN 'pending' THEN 40
      ELSE 10
    END;

    _flag_penalty := LEAST(40, (_compliance_flags * 10) + (_critical_flags * 20));
    _bkyc_bonus := CASE WHEN _has_business_kyc THEN 20 ELSE 0 END;

    _compliance_score := LEAST(100, GREATEST(0, _kyc_score - _flag_penalty + _bkyc_bonus));
  END;

  -- ═══════════════════════════════════════
  -- PILLAR 5: COUNTERPARTY NETWORK (20%)
  -- ═══════════════════════════════════════
  SELECT
    COUNT(DISTINCT buyer_id),
    COUNT(DISTINCT buyer_id) FILTER (WHERE buyer_id IN (
      SELECT t2.buyer_id FROM transactions t2
      WHERE t2.vendor_id = _vendor_id
      GROUP BY t2.buyer_id HAVING COUNT(*) > 1
    )),
    COUNT(*) FILTER (WHERE trade_scope IN ('regional', 'international') OR corridor_route IS NOT NULL)
  INTO _unique_buyers, _repeat_buyers, _cross_border_tx
  FROM transactions
  WHERE vendor_id = _vendor_id;

  DECLARE
    _diversity_score NUMERIC;
    _loyalty_score NUMERIC;
    _intl_score NUMERIC;
  BEGIN
    -- Diversity: 10+ unique buyers = 100
    _diversity_score := LEAST(100, (_unique_buyers::numeric / 10.0) * 100);

    -- Loyalty: repeat buyer ratio
    _loyalty_score := CASE WHEN _unique_buyers > 0
      THEN LEAST(100, (_repeat_buyers::numeric / _unique_buyers) * 100)
      ELSE 0 END;

    -- International reach
    _intl_score := CASE WHEN _total_tx > 0
      THEN LEAST(100, (_cross_border_tx::numeric / _total_tx) * 200)
      ELSE 0 END;

    _network_score := LEAST(100, GREATEST(0,
      (_diversity_score * 0.4) + (_loyalty_score * 0.35) + (_intl_score * 0.25)
    ));
  END;

  -- ═══════════════════════════════════════
  -- COMPOSITE SCORE (equal weight)
  -- ═══════════════════════════════════════
  _composite := ROUND(
    (_escrow_score * 0.20) +
    (_dispute_score * 0.20) +
    (_velocity_score * 0.20) +
    (_compliance_score * 0.20) +
    (_network_score * 0.20)
  , 1);

  _tier := CASE
    WHEN _composite >= 80 THEN 'low_risk'
    WHEN _composite >= 60 THEN 'moderate'
    WHEN _composite >= 40 THEN 'elevated'
    WHEN _composite >= 20 THEN 'high_risk'
    ELSE 'critical'
  END;

  _result := jsonb_build_object(
    'composite_score', _composite,
    'risk_tier', _tier,
    'pillars', jsonb_build_object(
      'escrow_performance', jsonb_build_object(
        'score', ROUND(_escrow_score, 1),
        'weight', 20,
        'details', jsonb_build_object(
          'total_transactions', _total_tx,
          'completed', _completed_tx,
          'cancelled', _cancelled_tx,
          'refunded', _refunded_tx,
          'avg_days_to_release', ROUND(_avg_days_to_release, 1)
        )
      ),
      'dispute_profile', jsonb_build_object(
        'score', ROUND(_dispute_score, 1),
        'weight', 20,
        'details', jsonb_build_object(
          'total_disputes', _total_disputes,
          'vendor_favorable', _vendor_favorable,
          'escalated_to_arbitration', _escalated,
          'dispute_rate_pct', CASE WHEN _total_tx > 0
            THEN ROUND((_total_disputes::numeric / _total_tx) * 100, 1) ELSE 0 END
        )
      ),
      'velocity_consistency', jsonb_build_object(
        'score', ROUND(_velocity_score, 1),
        'weight', 20,
        'details', jsonb_build_object(
          'tx_last_90_days', _tx_last_90,
          'tx_prev_90_days', _tx_prev_90,
          'total_volume_usd', ROUND(_total_volume, 2),
          'trend', CASE
            WHEN _tx_last_90 > _tx_prev_90 THEN 'growing'
            WHEN _tx_last_90 = _tx_prev_90 THEN 'stable'
            ELSE 'declining' END
        )
      ),
      'compliance_standing', jsonb_build_object(
        'score', ROUND(_compliance_score, 1),
        'weight', 20,
        'details', jsonb_build_object(
          'kyc_status', _kyc_status,
          'business_kyc_verified', _has_business_kyc,
          'compliance_flags', _compliance_flags,
          'critical_flags', _critical_flags
        )
      ),
      'counterparty_network', jsonb_build_object(
        'score', ROUND(_network_score, 1),
        'weight', 20,
        'details', jsonb_build_object(
          'unique_buyers', _unique_buyers,
          'repeat_buyers', _repeat_buyers,
          'cross_border_transactions', _cross_border_tx
        )
      )
    ),
    'computed_at', now(),
    'methodology_version', '1.0',
    'scoring_model', 'equal_weight_5_pillar'
  );

  -- Upsert cache
  INSERT INTO vendor_risk_scores (vendor_id, composite_score, risk_tier, pillar_scores, score_metadata, computed_at, updated_at)
  VALUES (_vendor_id, _composite, _tier, _result->'pillars', _result, now(), now())
  ON CONFLICT (vendor_id)
  DO UPDATE SET
    composite_score = EXCLUDED.composite_score,
    risk_tier = EXCLUDED.risk_tier,
    pillar_scores = EXCLUDED.pillar_scores,
    score_metadata = EXCLUDED.score_metadata,
    computed_at = EXCLUDED.computed_at,
    updated_at = EXCLUDED.updated_at;

  RETURN _result;
END;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_vendor_risk_scores_updated_at
  BEFORE UPDATE ON public.vendor_risk_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();