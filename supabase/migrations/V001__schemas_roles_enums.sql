-- ============================================================
-- V001: Create schemas, access roles, and custom enums
-- Source: Doc 19 Part A, Part B
-- ============================================================

-- ── Schemas ──────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS gcp;      -- Global Creator Plane
CREATE SCHEMA IF NOT EXISTS wp;       -- Workspace Plane
CREATE SCHEMA IF NOT EXISTS platform; -- System / infra plane

-- ── Access Roles ─────────────────────────────────────────────
-- GCP roles
CREATE ROLE gcp_write_role;   -- M2, M4, M5, M6 service accounts only
CREATE ROLE gcp_read_role;    -- All backend modules

GRANT USAGE ON SCHEMA gcp TO gcp_write_role, gcp_read_role;
GRANT SELECT ON ALL TABLES IN SCHEMA gcp TO gcp_read_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA gcp TO gcp_write_role;

-- WP roles
CREATE ROLE wp_write_role;    -- All feature modules
CREATE ROLE wp_read_role;

GRANT USAGE ON SCHEMA wp TO wp_write_role, wp_read_role;
GRANT SELECT ON ALL TABLES IN SCHEMA wp TO wp_read_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA wp TO wp_write_role;

-- Platform roles
CREATE ROLE platform_write_role;  -- Outbox relay, webhook gateway, audit writers
CREATE ROLE platform_read_role;

GRANT USAGE ON SCHEMA platform TO platform_write_role, platform_read_role;
GRANT SELECT ON ALL TABLES IN SCHEMA platform TO platform_read_role;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA platform TO platform_write_role;

-- ── Enum Types (Doc 19 Part B) ───────────────────────────────

CREATE TYPE platform_enum AS ENUM (
    'instagram', 'tiktok', 'youtube', 'twitter', 'facebook'
);

CREATE TYPE enrichment_source_enum AS ENUM (
    'youtube_data_api_v3', 'apify_actor', 'user_submitted', 'manual_entry'
);

CREATE TYPE completeness_tier_enum AS ENUM (
    'rich', 'standard', 'sparse', 'minimal'
);

CREATE TYPE creator_merge_status_enum AS ENUM (
    'active', 'candidate', 'merged_into'
);

CREATE TYPE snapshot_type_enum AS ENUM (
    'authenticity', 'quality', 'audience_estimate', 'summary', 'niche_classification'
);

CREATE TYPE confidence_level_enum AS ENUM (
    'high', 'medium', 'low', 'insufficient_data'
);

CREATE TYPE contact_type_enum AS ENUM (
    'email', 'whatsapp_number', 'website', 'other'
);

CREATE TYPE contact_source_enum AS ENUM (
    'scraped', 'provider_verified', 'user_submitted'
);

CREATE TYPE subscription_state_enum AS ENUM (
    'trialing', 'active', 'past_due', 'paused_grace', 'canceled_pending', 'expired'
);

CREATE TYPE member_role_enum AS ENUM (
    'owner', 'admin', 'member'
);

CREATE TYPE membership_status_enum AS ENUM (
    'active', 'suspended', 'pending_invite', 'removed'
);

CREATE TYPE campaign_objective_enum AS ENUM (
    'awareness', 'engagement', 'conversion', 'ugc'
);

CREATE TYPE campaign_status_enum AS ENUM (
    'active', 'archived', 'completed'
);

CREATE TYPE channel_enum AS ENUM (
    'email', 'whatsapp'
);

CREATE TYPE consent_state_enum AS ENUM (
    'unknown', 'contactable', 'opted_out', 'bounced_invalid', 'opt_in_required'
);

CREATE TYPE sequence_status_enum AS ENUM (
    'active', 'stopped', 'completed'
);

CREATE TYPE sequence_stop_reason_enum AS ENUM (
    'reply', 'opt_out', 'manual', 'stage_terminal',
    'campaign_archived', 'mailbox_revoked', 'quality_pause', 'subscription_expired'
);

CREATE TYPE ledger_entry_type_enum AS ENUM (
    'allowance_grant', 'topup_purchase', 'consumption', 'expiry',
    'refund_adjustment', 'promo_grant', 'reversal', 'reserved', 'released', 'committed'
);

CREATE TYPE reservation_status_enum AS ENUM (
    'active', 'committed', 'released', 'expired'
);

CREATE TYPE discovery_job_type_enum AS ENUM (
    'live_search', 'add_by_url', 'deep_enrichment', 'refresh'
);

CREATE TYPE discovery_job_status_enum AS ENUM (
    'queued', 'running', 'completed', 'failed', 'cancelled'
);

CREATE TYPE timeline_actor_type_enum AS ENUM (
    'user', 'system', 'ai', 'staff_impersonated'
);

CREATE TYPE scope_class_enum AS ENUM (
    'gcp', 'wp', 'platform'
);
