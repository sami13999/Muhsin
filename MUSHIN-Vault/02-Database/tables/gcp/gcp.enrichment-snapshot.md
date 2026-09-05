---
title: gcp.enrichment_snapshot
type: schema
plane: gcp
date: 2026-07-05
status: draft
tags: [database, enrichment_snapshot]
---

# 🗄 `gcp.enrichment_snapshot`

> [!abstract] Purpose
> Point-in-time snapshots of creator enrichment data. Each enrichment run creates a new snapshot, enabling trend analysis and data freshness tracking.

## Columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary identifier |
| creator_id | uuid | NOT NULL, FK → gcp.creator.id | Target creator |
| source | text | NOT NULL | Enrichment source: youtube_api, instagram_api, tiktok_api, manual, ai_inferred |
| payload | jsonb | NOT NULL | Raw enrichment payload from source |
| payload_completeness_tier | text | NOT NULL | Enum: basic, standard, full — how complete this snapshot is |
| follower_count | bigint | | Snapshot of follower count |
| engagement_rate | numeric(6,4) | | Snapshot of engagement rate |
| yt_subscriber_count | integer | | YouTube subscriber snapshot |
| yt_view_count | bigint | | YouTube total views snapshot |
| diff_from_previous | jsonb | | Delta from previous snapshot (computed) |
| created_at | timestamptz | NOT NULL, DEFAULT now() | When snapshot was taken |

## Indexes

| Name | Columns | Type | Rationale |
|---|---|---|---|
| idx_es_creator_created | creator_id, created_at DESC | Btree | Latest snapshots per creator |
| idx_es_source | source | Btree | Filter by enrichment source |
| idx_es_completeness | payload_completeness_tier | Btree | Filter by data quality |

## Relationships

- **[[gcp.creator]]** → `creator_id` FK (many-to-one): Target creator

## Lifecycle & Retention

- Append-only — historical snapshots never modified
- Retained for 12 months for trend analysis
- Latest snapshot per creator is materialized view for fast access
- Payload compressed at storage layer for cost optimization
- Created by [[04-Functions/workers/discovery-worker|discovery-worker]] during enrichment
- Creator details in [[02-Database/tables/gcp/gcp.creator|gcp.creator]]
