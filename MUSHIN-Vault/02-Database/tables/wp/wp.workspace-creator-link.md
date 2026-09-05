---
title: wp.workspace_creator_link
type: schema
plane: wp
date: 2026-07-05
status: draft
tags: [database, workspace_creator_link]
---

# 🗄 `wp.workspace_creator_link`

> [!abstract] Purpose
> Junction table mapping creators to workspaces with role-based access control. Enables multi-user collaboration on a single WordPress workspace.

## Columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary identifier |
| workspace_id | uuid | NOT NULL, FK → wp.workspace.id | Target workspace |
| creator_id | uuid | NOT NULL, FK → gcp.creator.id | User being granted access |
| role | text | NOT NULL, DEFAULT 'viewer' | Enum: owner, admin, member, viewer |
| granted_by | uuid | FK → gcp.creator.id | Who granted this access |
| created_at | timestamptz | NOT NULL, DEFAULT now() | When access was granted |
| revoked_at | timestamptz | | Soft-revoke marker (NULL = active) |

## Indexes

| Name | Columns | Type | Rationale |
|---|---|---|---|
| idx_wcl_workspace_creator | workspace_id, creator_id | UNIQUE | Prevent duplicate grants |
| idx_wcl_creator_id | creator_id | Btree | Query all workspaces for a user |
| idx_wcl_role | role | Btree | Filter by role type |

## Relationships

- **[[wp.workspace]]** → `workspace_id` FK (many-to-one): Parent workspace
- **[[gcp.creator]]** → `creator_id` FK (many-to-one): User with access
- **[[gcp.creator]]** → `granted_by` FK (many-to-one): Admin who granted access

## Lifecycle & Retention

- Soft-revoke via `revoked_at` — revoked links retained for audit trail
- Unique constraint on (workspace_id, creator_id) where revoked_at IS NULL
- Cascading delete when workspace is hard-deleted
- Role determines API access permissions
