---
title: gcp.niche_classification
type: schema
plane: gcp
date: 2026-07-05
status: draft
tags: [database, niche_classification]
---

# 🗄 `gcp.niche_classification`

> [!abstract] Purpose
> Maps creators to niche categories with confidence scores. Supports multi-niche classification and AI-inferred categorization from content analysis.

## Columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary identifier |
| creator_id | uuid | NOT NULL, FK → gcp.creator.id | Target creator |
| niche_code | text | NOT NULL | Niche identifier (references platform.niche_vocab) |
| confidence | numeric(4,3) | NOT NULL, CHECK (confidence BETWEEN 0 AND 1) | Classification confidence (0.000 - 1.000) |
| source | text | NOT NULL | Enum: manual, ai_inferred, platform_tag, self_reported |
| is_primary | boolean | NOT NULL, DEFAULT false | Whether this is the creator's primary niche |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Classification timestamp |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | Last modification timestamp |

## Indexes

| Name | Columns | Type | Rationale |
|---|---|---|---|
| idx_nc_creator_niche | creator_id, niche_code | UNIQUE | One classification per niche per creator |
| idx_nc_niche | niche_code | Btree | All creators in a niche |
| idx_nc_primary | creator_id, is_primary | Btree WHERE is_primary = true | Primary niche per creator |
| idx_nc_confidence | confidence | Btree | High-confidence classifications |

## Relationships

- **[[gcp.creator]]** → `creator_id` FK (many-to-one): Target creator
- **[[platform.niche-vocab]]** → `niche_code` (soft reference): Niche vocabulary

## Lifecycle & Retention

- AI-inferred classifications have confidence < 0.8; manual overrides always 1.0
- Primary niche enforced: only one row per creator where is_primary = true
- Retained indefinitely for discovery filtering
- Created by [[04-Functions/workers/discovery-worker|discovery-worker]] during enrichment
- Creator details in [[02-Database/tables/gcp/gcp.creator|gcp.creator]]
