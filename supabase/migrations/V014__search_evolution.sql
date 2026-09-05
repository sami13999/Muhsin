-- ============================================================
-- V014: Search Evolution — Demographics, Rising Score, Trending
-- Adds audience_demographics to gcp.profile for structured
-- demographic access (age, gender, city, country).
--
-- Rising score and trending score are computed at query time
-- from enrichment snapshot history — no new columns needed.
-- ============================================================

-- ── Add audience_demographics to gcp.profile ─────────────────
ALTER TABLE gcp.profile ADD COLUMN audience_demographics JSONB;

COMMENT ON COLUMN gcp.profile.audience_demographics IS
  'Structured audience demographics (age, gender, geo). '
  'LLM-derived estimates, not measurements (CC-003). '
  'Format: { "age": { "18-24": 0.25, "25-34": 0.35, "35-44": 0.25, "45+": 0.15 }, '
  '          "gender": { "female": 0.70, "male": 0.30 }, '
  '          "cities": { "Karachi": 0.40, "Lahore": 0.25, "Islamabad": 0.15 }, '
  '          "countries": { "Pakistan": 0.65, "UAE": 0.15, "UK": 0.10 } }';

-- Index for demographic queries
CREATE INDEX idx_profile_audience_demographics
  ON gcp.profile USING GIN (audience_demographics)
  WHERE audience_demographics IS NOT NULL;

-- ── Add rising_score cache table (optional optimization) ─────
-- Rising score can be computed at query time or cached here.
-- This table is optional — the default path computes on-the-fly.
CREATE TABLE IF NOT EXISTS gcp.rising_score_cache (
  creator_id      UUID        PRIMARY KEY REFERENCES gcp.creator(creator_id) ON DELETE CASCADE,
  score           NUMERIC(5,4) NOT NULL DEFAULT 0,
  inputs          JSONB       NOT NULL DEFAULT '{}',
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 hour'
);

COMMENT ON TABLE gcp.rising_score_cache IS
  'Optional cache for rising_score computation. '
  'Score is computed from enrichment snapshot history. '
  'TTL: 1 hour. Can be disabled via RISING_SCORE_ENABLED=false.';

CREATE INDEX idx_rising_score_expires
  ON gcp.rising_score_cache (expires_at)
  WHERE expires_at > NOW();

-- ── Add trending_score cache table (optional optimization) ───
CREATE TABLE IF NOT EXISTS gcp.trending_score_cache (
  creator_id      UUID        PRIMARY KEY REFERENCES gcp.creator(creator_id) ON DELETE CASCADE,
  score           NUMERIC(5,4) NOT NULL DEFAULT 0,
  inputs          JSONB       NOT NULL DEFAULT '{}',
  trend_direction TEXT        NOT NULL DEFAULT 'steady'
    CHECK (trend_direction IN ('accelerating', 'steady', 'decelerating')),
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 minutes'
);

COMMENT ON TABLE gcp.trending_score_cache IS
  'Optional cache for trending_score computation. '
  'Score measures short-term momentum (acceleration + recent growth). '
  'TTL: 30 minutes. Can be disabled via TRENDING_SORT_ENABLED=false.';

CREATE INDEX idx_trending_score_expires
  ON gcp.trending_score_cache (expires_at)
  WHERE expires_at > NOW();
