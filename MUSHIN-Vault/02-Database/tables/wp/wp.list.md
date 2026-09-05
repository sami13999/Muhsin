---
title: wp.list
type: schema
plane: wp
date: 2026-07-05
status: draft
tags: [database, list]
---

# 🗄 `wp.list`

> [!abstract] Purpose
> User-defined creator lists for organizing and segmenting creators within a workspace. Lists are workspace-scoped and support nested membership.

## Columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary identifier |
| workspace_id | uuid | NOT NULL, FK → wp.workspace.id | Owning workspace |
| name | text | NOT NULL | List display name |
| description | text | | Optional description |
| created_by | uuid | NOT NULL, FK → wp.app_user.id | User who created the list |
| is_default | boolean | NOT NULL, DEFAULT false | System-managed default list (cannot delete) |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Row creation timestamp |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | Last modification timestamp |

## Indexes

| Name | Columns | Type | Rationale |
|---|---|---|---|
| idx_list_workspace | workspace_id | Btree | All lists in workspace |
| idx_list_created_by | created_by | Btree | Lists created by user |

## Relationships

- **[[wp.workspace]]** → `workspace_id` FK (many-to-one): Parent workspace
- **[[wp.app-user]]** → `created_by` FK (many-to-one): Creator
- **[[wp.list-membership]]** → list_id FK (one-to-many): List members

## Lifecycle & Retention

- Default lists (`is_default = true`) cannot be deleted
- Cascade delete removes list memberships when list is deleted
- List members managed via [[02-Database/tables/wp/wp.list-membership|wp.list_membership]]
