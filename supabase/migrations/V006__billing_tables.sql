-- ============================================================
-- V006: Billing Tables — Webhook storage and subscription events
-- Source: Doc 19 Part E (Billing), ADR-030 (Reservation lifecycle)
--
-- Tables:
--   wp.paddle_webhook_raw — Raw webhook storage (idempotency + audit)
--   wp.subscription_event — Normalized billing events (immutable)
-- ============================================================

-- ── wp.paddle_webhook_raw ─────────────────────────────────────
-- Stores raw webhook payloads for idempotency and audit trail.
-- Webhook verification happens before insert; raw payload stored
-- for debugging and replay if needed.

CREATE TABLE wp.paddle_webhook_raw (
    webhook_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    paddle_event_id     TEXT        UNIQUE NOT NULL,
    -- Paddle's own event ID for idempotency
    event_type          TEXT        NOT NULL,
    raw_payload         JSONB       NOT NULL,
    signature           TEXT        NOT NULL,
    verified            BOOLEAN     NOT NULL DEFAULT false,
    processed_at        TIMESTAMPTZ,
    -- NULL = pending processing; set after domain event emitted
    processing_error    TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_paddle_webhook_pending ON wp.paddle_webhook_raw (created_at)
    WHERE processed_at IS NULL;

CREATE INDEX idx_paddle_webhook_event_type ON wp.paddle_webhook_raw (event_type, created_at);


-- ── wp.subscription_event ─────────────────────────────────────
-- Normalized billing events. Immutable, append-only.
-- Derived from paddle_webhook_raw after verification.

CREATE TABLE wp.subscription_event (
    event_id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID        NOT NULL REFERENCES wp.workspace(workspace_id) ON DELETE CASCADE,
    subscription_id     TEXT        NOT NULL,
    event_type          TEXT        NOT NULL,
    -- subscription_created, subscription_updated, subscription_cancelled,
    -- payment_succeeded, payment_failed
    status              TEXT,
    -- Subscription status at time of event
    price_id            TEXT,
    customer_id         TEXT,
    amount              BIGINT,
    -- Amount in smallest currency unit (cents)
    currency            TEXT        DEFAULT 'USD',
    metadata            JSONB       DEFAULT '{}',
    paddle_event_id     TEXT,
    -- Reference to raw webhook for audit trail
    occurred_at         TIMESTAMPTZ NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscription_event_workspace
    ON wp.subscription_event (workspace_id, created_at);
CREATE INDEX idx_subscription_event_sub
    ON wp.subscription_event (subscription_id, created_at);
CREATE INDEX idx_subscription_event_type
    ON wp.subscription_event (event_type, created_at);


-- ── RLS ──────────────────────────────────────────────────────
-- paddle_webhook_raw is system-level (no RLS — accessed by webhook handler)
-- subscription_event is workspace-scoped

ALTER TABLE wp.subscription_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscription_event_select ON wp.subscription_event
  FOR SELECT
  USING (
    workspace_id::text = current_setting('app.current_workspace_id', true)
  );

CREATE POLICY subscription_event_insert ON wp.subscription_event
  FOR INSERT
  WITH CHECK (
    workspace_id::text = current_setting('app.current_workspace_id', true)
  );
