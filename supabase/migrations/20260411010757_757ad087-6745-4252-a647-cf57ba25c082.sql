
-- ============================================
-- MATCHMAKING: compute_match_score
-- Scores compatibility between two users (0-100)
-- ============================================
CREATE OR REPLACE FUNCTION public.compute_match_score(
  _user_a uuid,
  _user_b uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _profile_a record;
  _profile_b record;
  _industry_score numeric := 0;
  _corridor_score numeric := 0;
  _location_score numeric := 0;
  _history_score numeric := 0;
  _entity_score numeric := 0;
  _composite numeric := 0;
  _shared_tx integer := 0;
  _successful_tx integer := 0;
BEGIN
  -- Load profiles
  SELECT id, onboarding_industry, corridor, location, entity_type
  INTO _profile_a
  FROM profiles WHERE id = _user_a;

  SELECT id, onboarding_industry, corridor, location, entity_type
  INTO _profile_b
  FROM profiles WHERE id = _user_b;

  IF _profile_a IS NULL OR _profile_b IS NULL THEN
    RETURN jsonb_build_object('composite_score', 0, 'reason', 'profile_not_found');
  END IF;

  -- ── INDUSTRY (30 pts) ──
  IF _profile_a.onboarding_industry IS NOT NULL
     AND _profile_a.onboarding_industry = _profile_b.onboarding_industry THEN
    _industry_score := 30;
  END IF;

  -- ── CORRIDOR (25 pts) ──
  IF _profile_a.corridor IS NOT NULL
     AND _profile_a.corridor = _profile_b.corridor THEN
    _corridor_score := 25;
  ELSIF _profile_a.corridor IS NOT NULL AND _profile_b.corridor IS NOT NULL THEN
    -- Partial match: same region substring
    IF LEFT(_profile_a.corridor, 3) = LEFT(_profile_b.corridor, 3) THEN
      _corridor_score := 10;
    END IF;
  END IF;

  -- ── LOCATION (20 pts) ──
  IF _profile_a.location IS NOT NULL AND _profile_b.location IS NOT NULL THEN
    IF LOWER(_profile_a.location) = LOWER(_profile_b.location) THEN
      _location_score := 20;
    ELSIF LOWER(SPLIT_PART(_profile_a.location, ',', -1)) = LOWER(SPLIT_PART(_profile_b.location, ',', -1)) THEN
      _location_score := 12;  -- same country
    END IF;
  END IF;

  -- ── TRANSACTION HISTORY (15 pts) ──
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status IN ('released', 'completed'))
  INTO _shared_tx, _successful_tx
  FROM transactions
  WHERE (vendor_id = _user_a AND buyer_id = _user_b)
     OR (vendor_id = _user_b AND buyer_id = _user_a);

  IF _successful_tx >= 3 THEN
    _history_score := 15;
  ELSIF _successful_tx >= 1 THEN
    _history_score := 10;
  ELSIF _shared_tx >= 1 THEN
    _history_score := 5;
  END IF;

  -- ── ENTITY COMPATIBILITY (10 pts) ──
  IF _profile_a.entity_type = 'business' AND _profile_b.entity_type = 'business' THEN
    _entity_score := 10;
  ELSIF _profile_a.entity_type = 'business' OR _profile_b.entity_type = 'business' THEN
    _entity_score := 6;
  ELSE
    _entity_score := 3;
  END IF;

  _composite := _industry_score + _corridor_score + _location_score + _history_score + _entity_score;

  RETURN jsonb_build_object(
    'composite_score', _composite,
    'breakdown', jsonb_build_object(
      'industry', _industry_score,
      'corridor', _corridor_score,
      'location', _location_score,
      'history', _history_score,
      'entity', _entity_score
    )
  );
END;
$$;

-- ============================================
-- MATCHMAKING: get_recommended_matches
-- Returns top N matches for a user within a target role
-- ============================================
CREATE OR REPLACE FUNCTION public.get_recommended_matches(
  _user_id uuid,
  _target_role app_role,
  _limit integer DEFAULT 5
)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  company_name text,
  entity_type text,
  location text,
  onboarding_industry text,
  corridor text,
  avatar_url text,
  match_score numeric,
  match_breakdown jsonb
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _candidate record;
  _score_result jsonb;
BEGIN
  FOR _candidate IN
    SELECT p.id, p.full_name, p.company_name, p.entity_type,
           p.location, p.onboarding_industry, p.corridor, p.avatar_url
    FROM profiles p
    INNER JOIN user_roles ur ON ur.user_id = p.id AND ur.role = _target_role
    WHERE p.id != _user_id
      AND p.status = 'active'
    -- Exclude users who also hold the caller's own role (pure role match only)
    AND NOT EXISTS (
      SELECT 1 FROM user_roles ur2
      WHERE ur2.user_id = p.id
        AND ur2.role IN (
          SELECT ur3.role FROM user_roles ur3 WHERE ur3.user_id = _user_id
        )
    )
    LIMIT 50  -- pre-filter cap for performance
  LOOP
    _score_result := compute_match_score(_user_id, _candidate.id);

    user_id := _candidate.id;
    full_name := _candidate.full_name;
    company_name := _candidate.company_name;
    entity_type := _candidate.entity_type;
    location := _candidate.location;
    onboarding_industry := _candidate.onboarding_industry;
    corridor := _candidate.corridor;
    avatar_url := _candidate.avatar_url;
    match_score := (_score_result->>'composite_score')::numeric;
    match_breakdown := _score_result->'breakdown';

    RETURN NEXT;
  END LOOP;

  -- Re-sort by score descending (plpgsql loop doesn't guarantee order)
  -- Actually we need a different approach - use a temp result
  RETURN;
END;
$$;

-- Wrapper that returns sorted results
CREATE OR REPLACE FUNCTION public.get_top_matches(
  _user_id uuid,
  _target_role app_role,
  _limit integer DEFAULT 5
)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  company_name text,
  entity_type text,
  location text,
  onboarding_industry text,
  corridor text,
  avatar_url text,
  match_score numeric,
  match_breakdown jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM get_recommended_matches(_user_id, _target_role, _limit)
  ORDER BY match_score DESC
  LIMIT _limit;
$$;
