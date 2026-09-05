---
title: wp.discovery_job
type: schema
plane: wp
date: 2026-07-05
status: draft
tags: [database, discovery_job]
---

# 🗄 `wp.discovery_job`

> [!abstract] Purpose
> Tracks asynchronous creator discovery jobs. When a user searches for creators by criteria (niche, audience size, platform), a discovery job is queued and processed by the discovery-worker.

## Columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary identifier |
| workspace_id | uuid | NOT NULL, FK → wp.workspace.id | Owning workspace |
| requested_by | uuid | NOT NULL, FK → wp.app_user.id | User who initiated discovery |
| query | jsonb | NOT NULL | Search criteria: {niche, min_followers, max_followers, platforms[], location} |
| status | text | NOT NULL, DEFAULT 'queued' | Enum: queued, running, completed, failed |
| result_count | integer | DEFAULT 0 | Number of matching creators found |
| cursor | text | | Pagination cursor for result streaming |
| error | jsonb | | Error details if failed |
| started_at | timestamptz | | When processing began |
| completed_at | timestamptz | | When processing finished |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Job creation timestamp |

## Indexes

| Name | Columns | Type | Rationale |
|---|---|---|---|
| idx_dj_status_created | status, created_at | Btree | Worker polling for queued jobs |
| idx_dj_workspace | workspace_id | Btree | Jobs per workspace |
| idx_dj_requested_by | requested_by | Btree | Jobs by user |

## Relationships

- **[[wp.workspace]]** → `workspace_id` FK (many-to-one): Parent workspace
- **[[wp.app-user]]** → `requested_by` FK (many-to-one): Requesting user
- **[[wp.credit-reservation]]** → workspace_id (indirect): Credits reserved before job starts

## Lifecycle & Retention

- Processed by [[04-Functions/workers/discovery-worker|discovery-worker]] (polling interval: 10s)
- Jobs timeout after 5 minutes (status → failed)
- Results streamed via cursor for large result sets
- Completed jobs retained for 7 days, then purged by [[04-Functions/workers/sweeper|sweeper]]
