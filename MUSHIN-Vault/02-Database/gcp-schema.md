---
title: "GCP Schema — Global Creator Plane"
status: Active
last_updated: 2026-07-06
tags: [database, gcp, schema, doc-19]
---

# GCP Schema — Global Creator Plane

**Source:** Doc 19 Part C, D | **Migration:** V002 | **Schema:** `gcp`

The GCP is the global, workspace-independent data plane for creators. All creator identity, enrichment, and intelligence data lives here. No workspace-scoped data exists in this schema.

**Critical invariants:**
- NO foreign keys cross from `gcp` to `wp` or `platform` (ADR-024)
- GDPR erasure = PII nullification tombstone, never DELETE (ADR-025)
- Only M2, M4, M5, M6 have `gcp_write_role` (Doc 14 Part C)

---

## Tables

### `gcp.creator`

Canonical person/entity record. PII fields are nulled on GDPR erasure.

| Column | Type | Notes |
|---|---|---|
| `creator_id` | UUID PK | Default `gen_random_uuid()` |
| `display_name` | TEXT | PII — nulled to `[erased]` on GDPR |
| `primary_handle` | TEXT | PII — nulled on GDPR |
| `merge_status` | `creator_merge_status_enum` | `active` / `candidate` / `merged_into` |
| `merged_into_creator_id` | UUID | Self-FK; redirect stub for merged creators |
| `merge_candidate_for` | UUID | Self-FK; pending identity resolution |
| `merge_confidence` | NUMERIC(5,4) | 0.0000–1.0000 |
| `index_pending` | BOOLEAN | TRUE while Meilisearch projection in-flight (ADR-027) |
| `pii_erased_at` | TIMESTAMPTZ | GDPR erasure timestamp |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Indexes:** `idx_creator_merge_status` (partial), `idx_creator_pii_erased` (partial)

---

### `gcp.profile`

Single social-platform account linked to a Creator. Bimodal enrichment: YouTube Data API v3 produces rich data; Apify produces sparse data.

| Column | Type | Notes |
|---|---|---|
| `profile_id` | UUID PK | |
| `creator_id` | UUID FK → `gcp.creator` | |
| `platform` | `platform_enum` | instagram, tiktok, youtube, twitter, facebook |
| `canonical_url` | TEXT | Normalized dedup key (PATCH-007) |
| `handle` | TEXT | |
| `handle_variants` | TEXT[] | Transliteration expansions from T-A LLM |
| `enrichment_source` | `enrichment_source_enum` | `youtube_data_api_v3` / `apify_actor` / `user_submitted` / `manual_entry` |
| `payload_completeness_tier` | `completeness_tier_enum` | `rich` / `standard` / `sparse` / `minimal` |
| `enrichment_status` | TEXT | `fresh` / `stale` / `pending` / `failed` / `unsupported` |
| `enriched_at` | TIMESTAMPTZ | |
| `enrichment_ttl_days` | INTEGER | Default 30 |
| `follower_count` | BIGINT | Universal (YT: subscriber_count) |
| `engagement_rate` | NUMERIC(8,6) | |
| `last_post_at` | TIMESTAMPTZ | |
| `yt_subscriber_count` | BIGINT | YouTube only |
| `yt_view_count` | BIGINT | YouTube only |
| `yt_video_count` | INTEGER | YouTube only |
| `yt_subscriber_to_view_ratio` | NUMERIC(10,8) | YouTube authenticity signal (spike 2026-07-05) |
| `yt_avg_views_per_video` | NUMERIC(12,2) | YouTube only |
| `platform_metrics` | JSONB | Structured non-critical payload |
| `scraped_payload_ref` | TEXT | Object storage key for raw payload |
| `index_projection_version` | INTEGER | Stale projection detection |
| `pii_erased_at` | TIMESTAMPTZ | |

**Unique:** `(platform, canonical_url)` — M5 UPSERT target

**Indexes:** `idx_profile_creator`, `idx_profile_enrichment_status` (partial), `idx_profile_index_pending` (partial), `idx_profile_yt_ratio` (partial)

---

### `gcp.enrichment_snapshot`

Versioned intelligence output. Immutable — corrections are new rows.

| Column | Type | Notes |
|---|---|---|
| `snapshot_id` | UUID PK | |
| `creator_id` | UUID FK → `gcp.creator` | |
| `snapshot_type` | `snapshot_type_enum` | authenticity, quality, audience_estimate, summary, niche_classification |
| `verdict` | JSONB | Score output |
| `evidence_breakdown` | JSONB | Evidence items per A4 standard |
| `confidence_level` | `confidence_level_enum` | high, medium, low, insufficient_data |
| `data_basis_statement` | TEXT | Human-readable data availability summary |
| `prompt_version` | TEXT | Format: `{task_id}:{version}` |
| `model_version` | TEXT | Format: `{provider}:{model_id}` |
| `content_hash` | TEXT | SHA-256 dedup key (PATCH-010) |
| `is_current` | BOOLEAN | Active score per (creator_id, snapshot_type) |
| `job_id` | UUID | Cost attribution |

**Indexes:** `idx_snapshot_creator_type_current` (partial), `idx_snapshot_prompt_version` (partial)

---

### `gcp.niche_classification`

Active niche classification per creator. Values validated against `platform.niche_vocab`.

| Column | Type | Notes |
|---|---|---|
| `classification_id` | UUID PK | |
| `creator_id` | UUID FK → `gcp.creator` | |
| `primary_niche` | TEXT | Validated against `platform.niche_vocab.slug` |
| `secondary_niches` | TEXT[] | Max 3 |
| `niche_confidence` | `confidence_level_enum` | |
| `prompt_version` | TEXT | |
| `classified_at` | TIMESTAMPTZ | |
| `is_current` | BOOLEAN | |

**Unique:** `idx_niche_class_current` — partial unique on `(creator_id) WHERE is_current = TRUE`

---

### `gcp.contact_record`

GCP-level contact info. Workspace reveal action (`wp.reveal`) marks permission.

| Column | Type | Notes |
|---|---|---|
| `contact_id` | UUID PK | |
| `creator_id` | UUID FK → `gcp.creator` | |
| `contact_type` | `contact_type_enum` | email, whatsapp_number, website, other |
| `value` | TEXT | Nulled on GDPR erasure |
| `source` | `contact_source_enum` | scraped, provider_verified, user_submitted |
| `confidence` | `confidence_level_enum` | |
| `discovered_at` | TIMESTAMPTZ | |
| `pii_erased_at` | TIMESTAMPTZ | |

---

### `gcp.inflight_url_lock`

Ephemeral per-URL lock preventing concurrent intra-job dedup (PATCH-007/009).

| Column | Type | Notes |
|---|---|---|
| `canonical_url` | TEXT PK | Normalized profile URL |
| `job_id` | UUID | |
| `dispatched_at` | TIMESTAMPTZ | |
| `expires_at` | TIMESTAMPTZ | TTL = 15 minutes |

---

## Referenced: `platform.niche_vocab`

48-category controlled vocabulary (Doc 18 Part H). Seed data applied in V002.

---

## Enums (GCP-relevant)

| Enum | Values |
|---|---|
| `platform_enum` | instagram, tiktok, youtube, twitter, facebook |
| `enrichment_source_enum` | youtube_data_api_v3, apify_actor, user_submitted, manual_entry |
| `completeness_tier_enum` | rich, standard, sparse, minimal |
| `creator_merge_status_enum` | active, candidate, merged_into |
| `snapshot_type_enum` | authenticity, quality, audience_estimate, summary, niche_classification |
| `confidence_level_enum` | high, medium, low, insufficient_data |
| `contact_type_enum` | email, whatsapp_number, website, other |
| `contact_source_enum` | scraped, provider_verified, user_submitted |

---

## Meilisearch Projection (ADR-027)

New creators are projected to Meilisearch **synchronously** at ingestion time (not async).

**Projection function:** `packages/database/src/projections/creator-index-projection.ts`

The `projectCreatorToIndex(creatorId)` function:
1. Reads creator + primary profile (highest follower count) from GCP tables
2. Reads current enrichment snapshots (authenticity, quality, audience_estimate, summary)
3. Reads current niche classification
4. Flattens into the Meilisearch document schema (Doc 15 B1)
5. Returns the document for upsert to Meilisearch via the adapter

**Index document fields:**
- Identity: `creatorId`, `displayName`, `primaryHandle`, `handleVariants`
- Platform: `platform`, `canonicalUrl`, `followerCount`, `engagementRate`, `lastPostAt`
- LLM-derived: `primaryNiche`, `secondaryNiches`, `authenticityBand`, `authenticityScore`, `qualityScore`, `audiencePkShare`, `audienceGccShare`, `audienceDiasporaShare`, `languageMix`, `summary`
- Completeness: `completenessTier`, `enrichmentSource`
- Freshness: `lastEnrichedAt`, `indexProjectionVersion`

**GDPR:** Erased creators (`piiErasedAt IS NOT NULL`) are excluded from projection.

---

## Drizzle ORM

Schema definitions: `mushin-2.0/packages/database/src/schema/gcp/index.ts`
Enums: `mushin-2.0/packages/database/src/schema/enums/index.ts`
Projections: `mushin-2.0/packages/database/src/projections/creator-index-projection.ts`
