---
title: gcp.inflight_url_lock
type: schema
plane: gcp
date: 2026-07-05
status: draft
tags: [database, inflight_url_lock]
---

# 🗄 `gcp.inflight_url_lock`

> [!abstract] Purpose
> Ephemeral distributed lock to prevent duplicate URL processing across workers. When a URL is being enriched or scraped, a lock row prevents concurrent processing of the same URL.

## Columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary identifier |
| url_hash | text | NOT NULL, UNIQUE | SHA-256 hash of the locked URL |
| url | text | NOT NULL | Original URL (for debugging) |
| locked_by | text | NOT NULL | Worker instance ID holding the lock |
| locked_at | timestamptz | NOT NULL, DEFAULT now() | When lock was acquired |
| expires_at | timestamptz | NOT NULL | Auto-release time (default: 5 minutes) |
| purpose | text | NOT NULL | What operation is locked: enrichment, scrape, index |

## Indexes

| Name | Columns | Type | Rationale |
|---|---|---|---|
| idx_ifl_url_hash | url_hash | UNIQUE | One lock per URL |
| idx_ifl_expires | expires_at | Btree | Expiry sweeper polling |

## Relationships

- No FK relationships — ephemeral infrastructure table
- **[[gcp.creator]]** → used during creator enrichment (indirect)

## Lifecycle & Retention

- **TTL:** Locks auto-expire after 5 minutes (configurable)
- **Sweeper:** Background job ([[04-Functions/workers/sweeper|sweeper]]) deletes expired locks every 30 seconds
- **Conflict:** INSERT ON CONFLICT DO NOTHING; if row exists and not expired, URL is skipped
- **Cleanup:** All locks purged on worker startup to prevent stale locks from crashed workers
- Rows are ephemeral; no long-term retention
- Used by [[04-Functions/workers/discovery-worker|discovery-worker]] during creator enrichment
