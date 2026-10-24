-- ============================================================
-- V017: Lease and retry recovery columns for wp.discovery_job
-- Source: Phase 3B Recovery Hardening, ADR-016, ADR-020
--
-- Enables concurrency-safe atomic job claiming and automatic
-- recovery of crashed worker jobs using lease timeouts.
-- ============================================================

ALTER TABLE wp.discovery_job
    ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 3;

-- Index for identifying expired leases during worker recovery sweeps
CREATE INDEX IF NOT EXISTS idx_discovery_job_lease
    ON wp.discovery_job (status, lease_expires_at)
    WHERE status = 'running';
