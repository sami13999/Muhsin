---
title: wp.tag
type: schema
plane: wp
date: 2026-07-05
status: draft
tags: [database, tag]
---

# 🗄 `wp.tag`

> [!abstract] Purpose
> Workspace-scoped taxonomy tags for categorizing creators, campaigns, and other entities. Tags are free-form strings with optional color coding.

## Columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary identifier |
| workspace_id | uuid | NOT NULL, FK → wp.workspace.id | Owning workspace |
| name | text | NOT NULL | Tag display name |
| color | text | | Hex color code for UI rendering |
| created_by | uuid | FK → wp.app_user.id | User who created the tag |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Row creation timestamp |

## Indexes

| Name | Columns | Type | Rationale |
|---|---|---|---|
| idx_tag_workspace_name | workspace_id, name | UNIQUE | No duplicate tag names per workspace |
| idx_tag_workspace | workspace_id | Btree | All tags in workspace |

## Relationships

- **[[wp.workspace]]** → `workspace_id` FK (many-to-one): Parent workspace
- **[[wp.creator-tag]]** → tag_id FK (one-to-many): Tag applications to creators

## Lifecycle & Retention

- Cascade delete removes creator_tag associations when tag is deleted
- No soft-delete; tags are lightweight and hard-deletable
- Tag applications via [[02-Database/tables/wp/wp.creator-tag|wp.creator_tag]]
