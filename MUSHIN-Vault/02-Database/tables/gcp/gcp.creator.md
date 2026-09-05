---
title: gcp.creator
type: schema
plane: gcp
date: 2026-07-05
status: draft
tags: [database, creator]
---

# 🗄 `gcp.creator`

> [!abstract] Purpose
> Global creator registry across all platforms (YouTube, Instagram, TikTok, etc.). This is the canonical source of truth for creator identity, shared across all workspaces via soft FK (ADR-024).

## Columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary identifier |
| platform | text | NOT NULL | Enum: youtube, instagram, tiktok, twitter, facebook |
| platform_id | text | NOT NULL | Platform-specific user/channel ID |
| handle | text | NOT NULL | Username or handle on platform |
| display_name | text | | Display name from platform profile |
| avatar_url | text | | Profile image URL |
| bio | text | | Bio/description from platform |
| niche_primary | text | | Primary niche classification |
| niche_secondary | text | | Secondary niche classification |
| yt_subscriber_count | integer | | YouTube subscriber count (NULL for non-YouTube) |
| yt_view_count | bigint | | YouTube total view count |
| yt_subscriber_to_view_ratio | numeric(8,4) | | Computed: subscribers / views (engagement indicator) |
| follower_count | bigint | | Follower/subscriber count on primary platform |
| engagement_rate | numeric(6,4) | | Average engagement rate |
| location_country | text | | ISO 3166-1 alpha-2 country code |
| location_region | text | | State/province/region |
| languages | text[] | | Spoken languages (ISO 639-1) |
| enrichment_source | text | | Source of last enrichment: manual, api, scrape, ai_inferred |
| enrichment_updated_at | timestamptz | | When enrichment data was last refreshed |
| payload_completeness_tier | text | NOT NULL, DEFAULT 'basic' | Enum: basic, standard, full — data completeness level |
| index_pending | boolean | NOT NULL, DEFAULT false | Flag for index projection state (needs re-index) |
| pii_erased_at | timestamptz | | GDPR erasure marker (NULL = data present) |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Row creation timestamp |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | Last modification timestamp |

## Indexes

| Name | Columns | Type | Rationale |
|---|---|---|---|
| idx_creator_platform_id | platform, platform_id | UNIQUE | One record per platform+ID combo |
| idx_creator_handle | platform, handle | Btree | Lookup by handle per platform |
| idx_creator_niche | niche_primary | Btree | Filter by niche |
| idx_creator_subscribers | yt_subscriber_count | Btree | YouTube subscriber range queries |
| idx_creator_engagement | engagement_rate | Btree | Engagement rate sorting |
| idx_creator_index_pending | index_pending | Btree WHERE index_pending = true | Partial index for re-index queue |
| idx_creator_pii_erased | pii_erased_at | Btree | GDPR erasure queries |

## Relationships

- **[[wp.workspace-creator-link]]** → `creator_id` FK (soft FK, ADR-024): Creator access across workspaces
- **[[gcp.profile]]** → creator_id FK (one-to-one): Extended profile data
- **[[gcp.enrichment-snapshot]]** → creator_id FK (one-to-many): Enrichment history
- **[[gcp.niche-classification]]** → creator_id FK (one-to-many): Niche assignments
- **[[gcp.contact-record]]** → creator_id FK (one-to-many): Contact information
- **[[wp.reveal]]** → creator_id (indirect): Reveals of this creator
- **[[wp.campaign-creator]]** → creator_id (indirect): Campaign assignments
- **[[platform.niche-vocab]]** → niche_primary (soft reference): Niche vocabulary

## Lifecycle & Retention

- Global entity — not scoped to any workspace
- Soft FK from [[02-Database/tables/wp/wp.workspace-creator-link|wp.workspace_creator_link]] enables cross-workspace sharing (ADR-024)
- GDPR: Set `pii_erased_at` and null out PII columns on erasure request
- Enrichment data refreshed via [[04-Functions/workers/discovery-worker|discovery-worker]] on configurable interval
- `index_pending = true` triggers async search index update
