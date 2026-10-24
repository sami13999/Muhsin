-- ============================================================
-- V016: wp.discovery_job table for asynchronous creator discovery
-- Source: Doc 19 Part H, DOC-018, ADR-016
--
-- Tracks background discovery jobs submitted via POST /api/v1/creators/search/live.
-- Processed asynchronously by discovery-worker with RLS enforcement.
-- ============================================================

CREATE TABLE IF NOT EXISTS wp.discovery_job (
    job_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID NOT NULL REFERENCES wp.workspace(workspace_id) ON DELETE CASCADE,
    requested_by        UUID,
    query               JSONB NOT NULL,
    status              TEXT NOT NULL DEFAULT 'queued',
    result_count        INTEGER NOT NULL DEFAULT 0,
    results             JSONB DEFAULT '[]'::jsonb,
    pipeline_stages     JSONB,
    execution_stats     JSONB,
    error               JSONB,
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for worker polling and tenant queries
CREATE INDEX IF NOT EXISTS idx_discovery_job_workspace
    ON wp.discovery_job (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_discovery_job_status
    ON wp.discovery_job (status, created_at);

-- ── Row Level Security (RLS) ─────────────────────────────────
ALTER TABLE wp.discovery_job ENABLE ROW LEVEL SECURITY;
ALTER TABLE wp.discovery_job FORCE ROW LEVEL SECURITY;

CREATE POLICY discovery_job_workspace_isolation ON wp.discovery_job
    FOR ALL
    TO mushin_app
    USING (workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid)
    WITH CHECK (workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid);
