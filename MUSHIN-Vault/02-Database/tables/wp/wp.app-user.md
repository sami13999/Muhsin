---
title: wp.app_user
type: schema
plane: wp
date: 2026-07-05
status: draft
tags: [database, app_user]
---

# 🗄 `wp.app_user`

> [!abstract] Purpose
> Application-level user record linked to a WordPress user. Stores MUSHIN-specific profile data and preferences that extend the WP user model.

## Columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary identifier |
| workspace_id | uuid | NOT NULL, FK → wp.workspace.id | Owning workspace |
| wp_user_id | integer | NOT NULL | WordPress user ID from wp_users |
| email | text | NOT NULL | User email (denormalized from WP for query speed) |
| display_name | text | | Display name from WP |
| role | text | NOT NULL, DEFAULT 'viewer' | MUSHIN role: owner, admin, member, viewer |
| preferences | jsonb | DEFAULT '{}' | User UI/notification preferences |
| last_login_at | timestamptz | | Last successful login timestamp |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Row creation timestamp |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | Last modification timestamp |

## Indexes

| Name | Columns | Type | Rationale |
|---|---|---|---|
| idx_au_workspace_wp_user | workspace_id, wp_user_id | UNIQUE | One record per WP user per workspace |
| idx_au_email | email | Btree | Lookup by email |
| idx_au_workspace | workspace_id | Btree | Query all users in workspace |

## Relationships

- **[[wp.workspace]]** → `workspace_id` FK (many-to-one): Parent workspace
- **[[wp.membership]]** → user FK (one-to-many): Team memberships
- **[[wp.consent-state]]** → user FK (one-to-many): Consent records
- **[[wp.list]]** → created_by FK (one-to-many): Lists created by user
- **[[wp.campaign]]** → created_by FK (one-to-many): Campaigns created by user
- **[[wp.task]]** → assigned_to FK (one-to-many): Tasks assigned to user

## Lifecycle & Retention

- Soft-delete not used; rows removed on workspace cascade
- Preferences JSONB indexed via GIN
- Last login tracked for inactive user identification
- Workspace details in [[02-Database/tables/wp/wp.workspace|wp.workspace]]
