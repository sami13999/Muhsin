---
title: wp.interaction_timeline
type: schema
plane: wp
date: 2026-07-05
status: draft
tags: [database, interaction_timeline]
---

# 🗄 `wp.interaction_timeline`

> [!abstract] Purpose
> Append-only event log capturing all interactions between MUSHIN and WordPress workspaces. Used for analytics, debugging, and audit compliance.

## Columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary identifier |
| workspace_id | uuid | NOT NULL, FK → wp.workspace.id | Owning workspace |
| event_type | text | NOT NULL | Enum: sync, webhook, api_call, error, config_change |
| source | text | NOT NULL | Origin: mushin_api, wp_plugin, cron, webhook |
| payload | jsonb | NOT NULL | Event-specific data (request/response, error details) |
| creator_id | uuid | FK → gcp.creator.id | User who triggered (NULL = system) |
| duration_ms | integer | | Execution time in milliseconds |
| status | text | NOT NULL, DEFAULT 'success' | Enum: success, failure, partial |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Event timestamp |

## Indexes

| Name | Columns | Type | Rationale |
|---|---|---|---|
| idx_it_workspace_created | workspace_id, created_at DESC | Btree | Timeline queries per workspace |
| idx_it_event_type | event_type | Btree | Filter by event category |
| idx_it_status | status | Btree | Find failures for debugging |
| idx_it_creator_id | creator_id | Btree | User activity queries |
| idx_it_payload_gin | payload | GIN | JSONB payload search |

## Relationships

- **[[wp.workspace]]** → `workspace_id` FK (many-to-one): Parent workspace
- **[[gcp.creator]]** → `creator_id` FK (many-to-one): Triggering user (nullable)

## Lifecycle & Retention

- Append-only — no updates or deletes except retention cleanup
- Partitioned by `created_at` (monthly)
- Retained for 12 months, then archived to cold storage by [[04-Functions/workers/sweeper|sweeper]]
- Errors retained for 24 months for debugging
