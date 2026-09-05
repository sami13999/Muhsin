---
title: wp.workspace
type: schema
plane: wp
date: 2026-07-05
status: draft
tags: [database, workspace]
---

# 🗄 `wp.workspace`

> [!abstract] Purpose
> Core workspace entity representing a WordPress site integration within MUSHIN. Each workspace maps to a single WordPress installation and owns all related resources.

## Columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary identifier |
| external_id | text | NOT NULL, UNIQUE | WordPress site ID or domain hash |
| name | text | NOT NULL | Display name from WP site title |
| url | text | NOT NULL | WordPress site URL (canonical) |
| status | text | NOT NULL, DEFAULT 'active' | Enum: active, suspended, deleted |
| creator_id | uuid | FK → gcp.creator.id | Owner/creator reference |
| plan_tier | text | NOT NULL, DEFAULT 'free' | Subscription tier: free, pro, enterprise |
| metadata | jsonb | DEFAULT '{}' | WP-specific config (plugins, theme, version) |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Row creation timestamp |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | Last modification timestamp |
| deleted_at | timestamptz | | Soft-delete marker (NULL = active) |

## Indexes

| Name | Columns | Type | Rationale |
|---|---|---|---|
| idx_workspace_external_id | external_id | UNIQUE | Fast lookup by WordPress site identifier |
| idx_workspace_creator_id | creator_id | Btree | Query workspaces by owner |
| idx_workspace_status | status | Btree | Filter active/deleted workspaces |
| idx_workspace_plan_tier | plan_tier | Btree | Billing tier queries |

## Relationships

- **[[gcp.creator]]** → `creator_id` FK (many-to-one): Workspace belongs to a creator
- **[[wp.workspace-creator-link]]** → `workspace_id` FK (one-to-many): Creator access grants
- **[[wp.interaction-timeline]]** → `workspace_id` FK (one-to-many): Activity log
- **[[wp.credit-ledger-entry]]** → `workspace_id` FK (one-to-many): Billing ledger
- **[[wp.app-user]]** → via creator_id (one-to-many): Workspace users
- **[[wp.membership]]** → `workspace_id` FK (one-to-many): Team memberships
- **[[wp.campaign]]** → `workspace_id` FK (one-to-many): Workspace campaigns
- **[[wp.workspace-credit-balance]]** → `workspace_id` FK (one-to-one): Credit balance
- **[[wp.paddle-subscription]]** → `workspace_id` FK (one-to-one): Subscription
- **[[wp.consent-state]]** → `workspace_id` FK (one-to-many): User consents

## Lifecycle & Retention

- Soft-delete via `deleted_at` — rows retained for 90 days post-delete
- Partitioned by `created_at` (monthly) for query performance
- Metadata JSONB indexed via GIN for plugin/theme queries
- Access control via [[02-Database/tables/wp/wp.workspace-creator-link|wp.workspace_creator_link]]
