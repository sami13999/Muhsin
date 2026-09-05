-- ============================================================
-- V002: GCP Schema — Global Creator Plane tables
-- Source: Doc 19 Part C, D
-- Tables: creator, profile, enrichment_snapshot,
--          niche_classification, contact_record, inflight_url_lock
-- ============================================================

-- ── gcp.creator ──────────────────────────────────────────────
CREATE TABLE gcp.creator (
    creator_id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name            TEXT,
    primary_handle          TEXT,
    merge_status            creator_merge_status_enum NOT NULL DEFAULT 'active',
    merged_into_creator_id  UUID,
    merge_candidate_for     UUID,
    merge_confidence        NUMERIC(5,4),
    index_pending           BOOLEAN     NOT NULL DEFAULT FALSE,
    pii_erased_at           TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Self-references (same schema, allowed)
    CONSTRAINT fk_creator_merged_into
        FOREIGN KEY (merged_into_creator_id) REFERENCES gcp.creator(creator_id) ON DELETE RESTRICT,
    CONSTRAINT fk_creator_merge_candidate
        FOREIGN KEY (merge_candidate_for) REFERENCES gcp.creator(creator_id) ON DELETE RESTRICT
);

COMMENT ON TABLE gcp.creator IS
    'Canonical creator entity. Zero workspace-originating data. '
    'merge_status=merged_into records are permanent redirect stubs — never deleted. '
    'GDPR erasure: display_name and primary_handle are set to ''[erased]'', '
    'pii_erased_at is stamped. Row is retained for WP referential integrity (ADR-025).';

COMMENT ON COLUMN gcp.creator.index_pending IS
    'Set TRUE when a new creator is persisted to GCP but the search-index '
    'projection has not yet been confirmed (ADR-027). The M5 sync projection '
    'path clears this flag on successful index write. Brain-1 excludes these '
    'records to prevent serving incomplete projections.';

-- Indexes
CREATE INDEX idx_creator_merge_status
    ON gcp.creator (merge_status)
    WHERE merge_status IN ('candidate', 'merged_into');

CREATE INDEX idx_creator_pii_erased
    ON gcp.creator (pii_erased_at)
    WHERE pii_erased_at IS NOT NULL;


-- ── gcp.profile ──────────────────────────────────────────────
CREATE TABLE gcp.profile (
    profile_id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id                  UUID        NOT NULL REFERENCES gcp.creator(creator_id) ON DELETE RESTRICT,
    platform                    platform_enum NOT NULL,
    canonical_url               TEXT        NOT NULL,
    handle                      TEXT,
    handle_variants             TEXT[],
    enrichment_source           enrichment_source_enum NOT NULL DEFAULT 'user_submitted',
    payload_completeness_tier   completeness_tier_enum NOT NULL DEFAULT 'minimal',
    enrichment_status           TEXT        NOT NULL DEFAULT 'pending'
        CHECK (enrichment_status IN ('fresh', 'stale', 'pending', 'failed', 'unsupported')),
    enriched_at                 TIMESTAMPTZ,
    enrichment_ttl_days         INTEGER     NOT NULL DEFAULT 30,
    follower_count              BIGINT,
    engagement_rate             NUMERIC(8,6),
    last_post_at                TIMESTAMPTZ,
    yt_subscriber_count         BIGINT,
    yt_view_count               BIGINT,
    yt_video_count              INTEGER,
    yt_subscriber_to_view_ratio NUMERIC(10,8),
    yt_avg_views_per_video      NUMERIC(12,2),
    platform_metrics            JSONB,
    scraped_payload_ref         TEXT,
    index_projection_version    INTEGER     NOT NULL DEFAULT 0,
    pii_erased_at               TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- M5 UPSERT target (PATCH-007)
    CONSTRAINT uq_profile_platform_url UNIQUE (platform, canonical_url)
);

COMMENT ON TABLE gcp.profile IS
    'Single social-platform account belonging to a Creator. '
    'enrichment_source distinguishes YouTube Data API v3 (rich, structured) '
    'from Apify-sourced profiles (sparse). '
    'yt_subscriber_to_view_ratio is the spike-validated YouTube authenticity signal. '
    'payload_completeness_tier drives the Data-Gap Ladder CTA in the UI.';

COMMENT ON COLUMN gcp.profile.yt_subscriber_to_view_ratio IS
    'YouTube-only. Computed: total_views / subscriber_count. '
    'Spike-validated (2026-07-05) as the primary LLM authenticity signal for YouTube. '
    'Healthy organic channels: 0.05–0.20. Artificially inflated subscriber counts '
    'produce ratios near 0. NULL for all non-YouTube profiles.';

COMMENT ON COLUMN gcp.profile.payload_completeness_tier IS
    'Drives Data-Gap Ladder UX (Doc 8 A2). '
    'rich: YouTube Data API v3 response. '
    'standard: Apify scrape with core metrics available. '
    'sparse: Apify scrape with significant gaps. '
    'minimal: URL-only stub awaiting enrichment.';

-- Indexes
CREATE INDEX idx_profile_creator ON gcp.profile (creator_id);

CREATE INDEX idx_profile_enrichment_status
    ON gcp.profile (enrichment_status, enriched_at)
    WHERE enrichment_status IN ('stale', 'pending', 'failed');

CREATE INDEX idx_profile_index_pending
    ON gcp.profile (index_pending)
    WHERE index_pending = TRUE;

CREATE INDEX idx_profile_yt_ratio
    ON gcp.profile (yt_subscriber_to_view_ratio)
    WHERE enrichment_source = 'youtube_data_api_v3'
      AND yt_subscriber_to_view_ratio IS NOT NULL;


-- ── gcp.enrichment_snapshot ──────────────────────────────────
CREATE TABLE gcp.enrichment_snapshot (
    snapshot_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id          UUID        NOT NULL REFERENCES gcp.creator(creator_id) ON DELETE RESTRICT,
    snapshot_type       snapshot_type_enum NOT NULL,
    verdict             JSONB       NOT NULL,
    evidence_breakdown  JSONB       NOT NULL,
    confidence_level    confidence_level_enum NOT NULL,
    data_basis_statement TEXT       NOT NULL,
    prompt_version      TEXT        NOT NULL,
    model_version       TEXT        NOT NULL,
    content_hash        TEXT        NOT NULL,
    is_current          BOOLEAN     NOT NULL DEFAULT TRUE,
    job_id              UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE gcp.enrichment_snapshot IS
    'Versioned intelligence output. Immutable — corrections are new rows. '
    'ADR-028: every score carries its prompt_version + model_version. '
    'is_current identifies the active score per (creator_id, snapshot_type).';

-- Indexes
CREATE INDEX idx_snapshot_creator_type_current
    ON gcp.enrichment_snapshot (creator_id, snapshot_type)
    WHERE is_current = TRUE;

CREATE INDEX idx_snapshot_prompt_version
    ON gcp.enrichment_snapshot (snapshot_type, prompt_version, model_version)
    WHERE is_current = TRUE;


-- ── gcp.niche_classification ─────────────────────────────────
CREATE TABLE gcp.niche_classification (
    classification_id   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id          UUID        NOT NULL REFERENCES gcp.creator(creator_id) ON DELETE RESTRICT,
    primary_niche       TEXT        NOT NULL,
    secondary_niches    TEXT[]      NOT NULL DEFAULT '{}',
    niche_confidence    confidence_level_enum NOT NULL,
    prompt_version      TEXT        NOT NULL,
    classified_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_current          BOOLEAN     NOT NULL DEFAULT TRUE,

    CONSTRAINT uq_niche_current UNIQUE NULLS NOT DISTINCT (creator_id, is_current)
);

-- Partial unique index: exactly one current classification per creator
CREATE UNIQUE INDEX idx_niche_class_current
    ON gcp.niche_classification (creator_id)
    WHERE is_current = TRUE;


-- ── gcp.contact_record ───────────────────────────────────────
CREATE TABLE gcp.contact_record (
    contact_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id      UUID        NOT NULL REFERENCES gcp.creator(creator_id) ON DELETE RESTRICT,
    contact_type    contact_type_enum NOT NULL,
    value           TEXT,
    source          contact_source_enum NOT NULL,
    confidence      confidence_level_enum NOT NULL,
    discovered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pii_erased_at   TIMESTAMPTZ
);

CREATE INDEX idx_contact_creator ON gcp.contact_record (creator_id);


-- ── gcp.inflight_url_lock (PATCH-007) ────────────────────────
CREATE TABLE gcp.inflight_url_lock (
    canonical_url   TEXT        PRIMARY KEY,
    job_id          UUID        NOT NULL,
    dispatched_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL
);

COMMENT ON TABLE gcp.inflight_url_lock IS
    'Ephemeral per-URL lock held while a candidate is in-flight through '
    'the Apify → M5 pipeline (PATCH-009). Prevents concurrent jobs from '
    'independently discovering and double-scoring the same creator URL. '
    'TTL = 15 minutes. Swept every 5 minutes by the reservation sweeper job.';

CREATE INDEX idx_inflight_url_expires ON gcp.inflight_url_lock (expires_at);


-- ── platform.niche_vocab (referenced by gcp.niche_classification) ──
CREATE TABLE platform.niche_vocab (
    vocab_id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            TEXT        NOT NULL UNIQUE,
    display_name    TEXT        NOT NULL,
    parent_cluster  TEXT        NOT NULL,
    is_deprecated   BOOLEAN     NOT NULL DEFAULT FALSE,
    sort_order      INTEGER     NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE platform.niche_vocab IS
    'Controlled vocabulary for niche classification (Doc 18 Part H, 48 categories v1). '
    'Slug values are the enum used by T-A classifier output schema.';

-- Seed data: 48 niche categories (Doc 18 Part H)
INSERT INTO platform.niche_vocab (slug, display_name, parent_cluster, sort_order) VALUES
-- Lifestyle & Wellness
('lifestyle_general',           'Lifestyle (General)',              'Lifestyle & Wellness', 10),
('health_fitness',              'Health & Fitness',                 'Lifestyle & Wellness', 11),
('beauty_skincare',             'Beauty & Skincare',                'Lifestyle & Wellness', 12),
('fashion_style',               'Fashion & Style',                  'Lifestyle & Wellness', 13),
('food_cooking',                'Food & Cooking',                   'Lifestyle & Wellness', 14),
('travel_adventure',            'Travel & Adventure',               'Lifestyle & Wellness', 15),
('home_interior',               'Home & Interior',                  'Lifestyle & Wellness', 16),
('parenting_family',            'Parenting & Family',               'Lifestyle & Wellness', 17),
-- Entertainment & Culture
('comedy_humor',                'Comedy & Humor',                   'Entertainment & Culture', 20),
('music_performance',           'Music & Performance',              'Entertainment & Culture', 21),
('gaming_esports',              'Gaming & Esports',                 'Entertainment & Culture', 22),
('film_tv_reviews',             'Film & TV Reviews',                'Entertainment & Culture', 23),
('books_literature',            'Books & Literature',               'Entertainment & Culture', 24),
('art_illustration',            'Art & Illustration',               'Entertainment & Culture', 25),
('dance_choreography',          'Dance & Choreography',             'Entertainment & Culture', 26),
('podcasting',                  'Podcasting',                       'Entertainment & Culture', 27),
-- Knowledge & Education
('education_tutoring',          'Education & Tutoring',             'Knowledge & Education', 30),
('tech_gadgets',                'Tech & Gadgets',                   'Knowledge & Education', 31),
('finance_investing',           'Finance & Investing',              'Knowledge & Education', 32),
('personal_development',        'Personal Development',             'Knowledge & Education', 33),
('science_nature',              'Science & Nature',                 'Knowledge & Education', 34),
('history_culture',             'History & Culture',                'Knowledge & Education', 35),
('language_learning',           'Language Learning',                'Knowledge & Education', 36),
('career_professional',         'Career & Professional',            'Knowledge & Education', 37),
-- Business & Entrepreneurship
('startup_entrepreneurship',    'Startups & Entrepreneurship',     'Business & Entrepreneurship', 40),
('marketing_advertising',       'Marketing & Advertising',          'Business & Entrepreneurship', 41),
('ecommerce_retail',            'E-commerce & Retail',              'Business & Entrepreneurship', 42),
('freelancing_creator_economy', 'Freelancing & Creator Economy',    'Business & Entrepreneurship', 43),
('real_estate',                 'Real Estate',                      'Business & Entrepreneurship', 44),
('hr_management',               'HR & Management',                  'Business & Entrepreneurship', 45),
-- Social Impact & Community
('activism_social_causes',      'Activism & Social Causes',         'Social Impact & Community', 50),
('religion_spirituality_islamic','Religion & Spirituality (Islamic)','Social Impact & Community', 51),
('environment_sustainability',  'Environment & Sustainability',     'Social Impact & Community', 52),
('community_local',             'Community & Local',                'Social Impact & Community', 53),
-- Sports & Outdoors
('cricket_sports',              'Cricket & Sports',                 'Sports & Outdoors', 60),
('football_soccer',             'Football / Soccer',                'Sports & Outdoors', 61),
('outdoor_adventure_extreme',   'Outdoor & Extreme Sports',         'Sports & Outdoors', 62),
('motorsport',                  'Motorsport',                       'Sports & Outdoors', 63),
-- Pakistan-Specific High-Value
('pk_fashion_textile',          'PK Fashion & Textile',             'Pakistan-Specific High-Value', 70),
('pk_food_street',              'PK Food & Street Culture',         'Pakistan-Specific High-Value', 71),
('pk_politics_commentary',      'PK Politics & Commentary',         'Pakistan-Specific High-Value', 72),
('pk_drama_entertainment',      'PK Drama & Entertainment',         'Pakistan-Specific High-Value', 73),
('pk_tech_startups',            'PK Tech & Startups',               'Pakistan-Specific High-Value', 74),
('pk_agriculture_rural',        'PK Agriculture & Rural',           'Pakistan-Specific High-Value', 75),
('pk_diaspora_content',         'PK Diaspora Content',              'Pakistan-Specific High-Value', 76),
-- Commerce & Brands
('brand_collab_showcase',       'Brand Collab Showcase',            'Commerce & Brands', 80),
('ugc_creator',                 'UGC Creator',                      'Commerce & Brands', 81),
('affiliate_review',            'Affiliate & Review',               'Commerce & Brands', 82);
