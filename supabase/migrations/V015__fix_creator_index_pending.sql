-- ============================================================
-- V015: Forward Corrective Migration for Index Safety
-- Ensures idempotent index state for already-deployed environments:
-- 1. Creates idx_creator_index_pending on gcp.creator (ADR-027)
-- 2. Drops idx_profile_index_pending on gcp.profile if present
-- 3. Ensures valid B-tree indexes on cache tables without non-immutable predicates
-- ============================================================

-- ── 1. Fix Creator Index Pending Index (ADR-027) ────────────
CREATE INDEX IF NOT EXISTS idx_creator_index_pending
  ON gcp.creator (index_pending)
  WHERE index_pending = TRUE;

-- ── 2. Cleanup Erroneous Profile Index (if created) ─────────
DROP INDEX IF EXISTS gcp.idx_profile_index_pending;

-- ── 3. Cache Expiry Indexes (B-tree, valid PostgreSQL) ──────
CREATE INDEX IF NOT EXISTS idx_rising_score_expires
  ON gcp.rising_score_cache (expires_at);

CREATE INDEX IF NOT EXISTS idx_trending_score_expires
  ON gcp.trending_score_cache (expires_at);
