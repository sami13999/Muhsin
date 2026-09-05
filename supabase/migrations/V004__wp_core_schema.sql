-- ============================================================
-- V004: WP Core Schema — Workspace Plane tables
-- Source: Doc 19 Part E, F, G, H, I
-- Tables: workspace, membership, workspace_credit_balance,
--          credit_ledger_entry (partitioned), workspace_creator_link,
--          list, list_member, interaction_timeline (partitioned)
-- ============================================================

-- ── wp.workspace ─────────────────────────────────────────────
-- The tenancy and billing boundary. All WP data hangs off here.
CREATE TABLE wp.workspace (
    workspace_id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    TEXT        NOT NULL,
    slug                    TEXT        NOT NULL UNIQUE,
    logo_url                TEXT,
    default_timezone        TEXT        NOT NULL DEFAULT 'Asia/Karachi',
    default_currency        TEXT        NOT NULL DEFAULT 'PKR'
        CHECK (char_length(default_currency) = 3),

    -- Billing state (driven exclusively by Paddle webhooks, FS-08.02)
    subscription_state      subscription_state_enum NOT NULL DEFAULT 'trialing',
    subscription_plan_id    TEXT,
    subscription_paddle_id  TEXT,
    paddle_customer_id      TEXT,

    -- Entitlement snapshot invalidation key (Doc 10 A2)
    entitlement_snapshot_version INTEGER NOT NULL DEFAULT 0,

    trial_ends_at           TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workspace_slug ON wp.workspace (slug);
CREATE INDEX idx_workspace_paddle_sub ON wp.workspace (subscription_paddle_id)
    WHERE subscription_paddle_id IS NOT NULL;


-- ── wp.membership ────────────────────────────────────────────
-- User × Workspace × Role. Soft-delete: removed members'
-- artifacts are retained and reassigned (Doc 10 FS-07.01).
CREATE TABLE wp.membership (
    membership_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID        NOT NULL REFERENCES wp.workspace(workspace_id) ON DELETE CASCADE,
    user_id             UUID        NOT NULL,
    -- Soft FK to managed auth (not enforced - mirrors BaaS identity)
    role                member_role_enum NOT NULL DEFAULT 'member',
    status              membership_status_enum NOT NULL DEFAULT 'pending_invite',
    invited_email       TEXT,
    invited_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    joined_at           TIMESTAMPTZ,
    removed_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_membership UNIQUE (workspace_id, user_id)
);

CREATE INDEX idx_membership_user ON wp.membership (user_id);
CREATE INDEX idx_membership_workspace ON wp.membership (workspace_id);


-- ── wp.workspace_credit_balance ──────────────────────────────
-- Single row per workspace. SELECT FOR UPDATE target (ADR-026).
CREATE TABLE wp.workspace_credit_balance (
    workspace_id    UUID        PRIMARY KEY REFERENCES wp.workspace(workspace_id) ON DELETE CASCADE,
    balance         BIGINT      NOT NULL DEFAULT 0 CHECK (balance >= 0),
    -- Hard constraint: balance may never go below zero.
    version         INTEGER     NOT NULL DEFAULT 1,
    -- Optimistic lock version. Incremented on every balance change.
    -- ADR-026 reserve operation:
    --   BEGIN;
    --   SELECT balance, version FROM wp.workspace_credit_balance
    --     WHERE workspace_id = $1 FOR UPDATE;
    --   -- (application checks balance >= requested_amount)
    --   INSERT INTO wp.credit_ledger_entry (...) VALUES (...);
    --   UPDATE wp.workspace_credit_balance
    --     SET balance = balance - $amount, version = version + 1
    --     WHERE workspace_id = $1 AND version = $current_version;
    --   -- If UPDATE affects 0 rows: concurrent modification → retry (up to 3 times)
    --   COMMIT;
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ── wp.credit_ledger_entry (PARTITIONED) ─────────────────────
-- Append-only ledger (ADR-012). Monthly range partitioned (PATCH-004).
CREATE TABLE wp.credit_ledger_entry (
    entry_id                UUID            NOT NULL DEFAULT gen_random_uuid(),
    workspace_id            UUID            NOT NULL,
    entry_type              ledger_entry_type_enum NOT NULL,
    amount                  BIGINT          NOT NULL,
    -- Positive = credits added. Negative = credits consumed/reserved.
    reference_type          TEXT,
    -- e.g., 'enrichment', 'live_search', 'contact_reveal'
    reference_id            UUID,
    -- The job_id / enrichment_id that consumed these credits.
    provider_cost_snapshot  JSONB,
    -- {"provider": "openai", "model": "gpt-4o", "unitCost": 0.004, "tokens": 1500}
    period                  TEXT,
    -- Billing period: 'YYYY-MM' for allowance tracking
    description             TEXT,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    PRIMARY KEY (entry_id, created_at)
    -- Composite PK required for partitioned table (PostgreSQL constraint).
) PARTITION BY RANGE (created_at);

-- Initial partitions (M+2 policy per Doc 19 Part M1)
CREATE TABLE wp.credit_ledger_entry_2026_07
    PARTITION OF wp.credit_ledger_entry
    FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-08-01 00:00:00+00');

CREATE TABLE wp.credit_ledger_entry_2026_08
    PARTITION OF wp.credit_ledger_entry
    FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00');

CREATE TABLE wp.credit_ledger_entry_2026_09
    PARTITION OF wp.credit_ledger_entry
    FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');

-- Future partitions: partition_creation_job runs on the 15th of each month
-- and creates the partition for month+2.

-- Ledger indexes (PATCH-004)
CREATE INDEX idx_credit_ledger_workspace
    ON wp.credit_ledger_entry (workspace_id, created_at);
CREATE INDEX idx_credit_ledger_type
    ON wp.credit_ledger_entry (entry_type, created_at);
CREATE INDEX idx_credit_ledger_reference
    ON wp.credit_ledger_entry (reference_type, reference_id)
    WHERE reference_type IS NOT NULL;


-- ── wp.workspace_creator_link — THE GCP/WP BRIDGE (ADR-024) ─
-- CRITICAL: NO database-level FK to gcp.creator.creator_id.
-- This is a deliberate design decision (ADR-024) to enforce plane separation.
CREATE TABLE wp.workspace_creator_link (
    link_id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID        NOT NULL REFERENCES wp.workspace(workspace_id) ON DELETE CASCADE,
    creator_id          UUID        NOT NULL,
    -- Soft FK to gcp.creator. No DB-level FK (ADR-024).
    -- Application rule: creator_id must exist in gcp.creator at link creation time.
    added_by            UUID,
    -- User who added this creator (soft FK to managed auth)
    tags                TEXT[]      DEFAULT '{}',
    first_linked_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    workspace_removed_at TIMESTAMPTZ,
    -- Tier-1 deletion: workspace removes creator. GCP untouched.
    pii_deleted_at      TIMESTAMPTZ,
    -- Set by GDPR erasure consumer on creator.gdpr_erased event (ADR-025).

    CONSTRAINT uq_ws_creator_link UNIQUE (workspace_id, creator_id)
);

CREATE INDEX idx_wcl_workspace ON wp.workspace_creator_link (workspace_id);
CREATE INDEX idx_wcl_creator ON wp.workspace_creator_link (creator_id);
CREATE INDEX idx_wcl_active ON wp.workspace_creator_link (workspace_id, last_active_at DESC)
    WHERE workspace_removed_at IS NULL;


-- ── wp.list ──────────────────────────────────────────────────
CREATE TABLE wp.list (
    list_id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID        NOT NULL REFERENCES wp.workspace(workspace_id) ON DELETE CASCADE,
    name                TEXT        NOT NULL,
    description         TEXT,
    visibility          TEXT        NOT NULL DEFAULT 'workspace'
        CHECK (visibility IN ('private', 'workspace')),
    created_by          UUID,
    archived_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_list_workspace ON wp.list (workspace_id)
    WHERE archived_at IS NULL;


-- ── wp.list_member ───────────────────────────────────────────
-- Creator in a list. Soft-delete via removed_at.
CREATE TABLE wp.list_member (
    list_member_id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id                     UUID        NOT NULL REFERENCES wp.list(list_id) ON DELETE CASCADE,
    workspace_creator_link_id   UUID        NOT NULL REFERENCES wp.workspace_creator_link(link_id) ON DELETE CASCADE,
    added_by                    UUID,
    added_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    removed_at                  TIMESTAMPTZ,
    notes                       TEXT,

    CONSTRAINT uq_list_member_active
        UNIQUE NULLS NOT DISTINCT (list_id, workspace_creator_link_id, removed_at)
);

CREATE INDEX idx_list_member_list ON wp.list_member (list_id)
    WHERE removed_at IS NULL;
CREATE INDEX idx_list_member_wcl ON wp.list_member (workspace_creator_link_id);


-- ── wp.interaction_timeline (PARTITIONED) ────────────────────
-- Append-only, immutable (Doc 9 A1). Monthly range partitioned (PATCH-003).
CREATE TABLE wp.interaction_timeline (
    entry_id                    UUID            NOT NULL DEFAULT gen_random_uuid(),
    workspace_id                UUID            NOT NULL,
    -- NOT a FK — partitioned tables cannot have FK constraints
    -- that reference non-partitioned tables in all PostgreSQL versions.
    workspace_creator_link_id   UUID            NOT NULL,
    -- Soft FK to wp.workspace_creator_link
    event_type                  TEXT            NOT NULL,
    -- Validated against Doc 9 A1 taxonomy at application layer.
    -- Not a PG enum: taxonomy may grow; text avoids ALTER TYPE.
    actor_type                  TEXT            NOT NULL DEFAULT 'system'
        CHECK (actor_type IN ('user', 'system', 'staff')),
    actor_id                    TEXT            NOT NULL DEFAULT 'system',
    channel                     TEXT
        CHECK (channel IN ('email', 'whatsapp', 'manual', 'system')),
    campaign_id                 UUID,
    sequence_enrollment_id      UUID,
    payload                     JSONB           NOT NULL DEFAULT '{}',
    source_event_id             UUID,
    -- The domain event ID (Doc 16 A1 envelope) that triggered this entry.
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    PRIMARY KEY (entry_id, created_at)
    -- Composite PK required for partitioned table (PostgreSQL constraint).
) PARTITION BY RANGE (created_at);

COMMENT ON TABLE wp.interaction_timeline IS
    'Append-only workspace event log. M7 sole writer (Doc 14 Part C). '
    'Partitioned monthly on created_at (PATCH-003). '
    'GDPR erasure: creator PII in payload is scrubbed on creator.gdpr_erased; '
    'structural rows are retained for audit integrity (ADR-025).';

-- Initial partitions (M+2 policy)
CREATE TABLE wp.interaction_timeline_2026_07
    PARTITION OF wp.interaction_timeline
    FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-08-01 00:00:00+00');

CREATE TABLE wp.interaction_timeline_2026_08
    PARTITION OF wp.interaction_timeline
    FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00');

CREATE TABLE wp.interaction_timeline_2026_09
    PARTITION OF wp.interaction_timeline
    FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');

-- Timeline indexes (PATCH-003)
CREATE INDEX idx_timeline_workspace
    ON wp.interaction_timeline (workspace_id, created_at);
CREATE INDEX idx_timeline_wcl
    ON wp.interaction_timeline (workspace_creator_link_id, created_at);
CREATE INDEX idx_timeline_event_type
    ON wp.interaction_timeline (event_type, created_at);
CREATE INDEX idx_timeline_campaign
    ON wp.interaction_timeline (workspace_id, campaign_id, created_at)
    WHERE campaign_id IS NOT NULL;
CREATE INDEX idx_timeline_enrollment
    ON wp.interaction_timeline (sequence_enrollment_id)
    WHERE sequence_enrollment_id IS NOT NULL;


-- ── RLS (Doc 21 — three-layer enforcement, RLS is layer 3) ──
-- Layer 1 (middleware) and Layer 2 (repository) are the primary enforcement.
-- RLS is the safety net — it must never be the only layer.
ALTER TABLE wp.workspace ENABLE ROW LEVEL SECURITY;
ALTER TABLE wp.membership ENABLE ROW LEVEL SECURITY;
ALTER TABLE wp.workspace_credit_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE wp.credit_ledger_entry ENABLE ROW LEVEL SECURITY;
ALTER TABLE wp.workspace_creator_link ENABLE ROW LEVEL SECURITY;
ALTER TABLE wp.list ENABLE ROW LEVEL SECURITY;
ALTER TABLE wp.list_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE wp.interaction_timeline ENABLE ROW LEVEL SECURITY;
