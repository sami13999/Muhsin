---
title: wp.membership
type: schema
plane: wp
date: 2026-07-05
status: draft
tags: [database, membership]
---

# 🗄 `wp.membership`

> [!abstract] Purpose
> Represents a user's membership in a team or group within a workspace. Enables organizational structures beyond flat workspace-level roles.

## Columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary identifier |
| workspace_id | uuid | NOT NULL, FK → wp.workspace.id | Owning workspace |
| user_id | uuid | NOT NULL, FK → wp.app_user.id | Member user |
| team | text | NOT NULL | Team/group name (e.g., "marketing", "engineering") |
| role | text | NOT NULL, DEFAULT 'member' | Enum: lead, member, viewer |
| joined_at | timestamptz | NOT NULL, DEFAULT now() | When membership started |
| left_at | timestamptz | | Soft-leave marker (NULL = active) |

## Indexes

| Name | Columns | Type | Rationale |
|---|---|---|---|
| idx_mem_user_team | user_id, team | UNIQUE | One membership per user per team |
| idx_mem_workspace_team | workspace_id, team | Btree | Query team roster |
| idx_mem_user | user_id | Btree | All teams for a user |

## Relationships

- **[[wp.workspace]]** → `workspace_id` FK (many-to-one): Parent workspace
- **[[wp.app-user]]** → `user_id` FK (many-to-one): Member user

## Lifecycle & Retention

- Soft-leave via `left_at`; historical membership preserved for audit
- Team names are free-text, not FK — teams are implicit (created on first membership)
- User details in [[02-Database/tables/wp/wp.app-user|wp.app_user]]
