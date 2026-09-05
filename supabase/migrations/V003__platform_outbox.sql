-- ============================================================
-- V003: Platform schema — Transactional outbox + idempotency ledger
-- Source: Doc 19 Part K, ADR-020, Doc 16 Part A
-- ============================================================

-- ── platform.outbox (ADR-020) ────────────────────────────────
CREATE TABLE platform.outbox (
    outbox_id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id            UUID        NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    event_type          TEXT        NOT NULL,
    schema_version      TEXT        NOT NULL DEFAULT '1',
    scope_class         scope_class_enum NOT NULL,
    workspace_id        UUID,
    -- NULL for GCP and platform scope events
    actor_type          TEXT,
    actor_id            TEXT,
    correlation_id      UUID,
    causation_id        UUID,
    payload             JSONB       NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dispatched_at       TIMESTAMPTZ,
    -- Set by relay on successful queue publish. NULL = pending dispatch.
    dispatch_attempts   INTEGER     NOT NULL DEFAULT 0
);

COMMENT ON TABLE platform.outbox IS
    'Transactional outbox (ADR-020). Written atomically with state-change DB transactions. '
    'Relay polls WHERE dispatched_at IS NULL using SKIP LOCKED for parallel relay workers. '
    'dispatched_at IS NULL partial index makes O(pending_count), not O(table_size). '
    'Events older than 24h with dispatch_attempts > 5 are moved to DLQ by the relay.';

-- Critical partial index for relay performance (ADR-020)
CREATE INDEX idx_outbox_pending
    ON platform.outbox (created_at)
    WHERE dispatched_at IS NULL;


-- ── platform.processed_event_ledger (ADR-020, Doc 16 A3) ────
CREATE TABLE platform.processed_event_ledger (
    consumer_group      TEXT        NOT NULL,
    -- Format: '{module_id}:{event_type}' e.g. 'M10:billing.webhook_received'
    event_id            UUID        NOT NULL,
    processed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (consumer_group, event_id)
);

COMMENT ON TABLE platform.processed_event_ledger IS
    'Idempotency registry per consumer group (ADR-020). '
    'Before processing an event, consumer checks: '
    'SELECT 1 FROM platform.processed_event_ledger '
    'WHERE consumer_group = $1 AND event_id = $2. '
    'If found: skip (duplicate delivery). If not found: process then insert. '
    'This check+insert must be in the same DB transaction as the side-effect.';
