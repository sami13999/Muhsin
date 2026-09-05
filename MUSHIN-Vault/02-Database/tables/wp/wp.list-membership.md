---
title: wp.list_membership
type: schema
plane: wp
date: 2026-07-05
status: draft
tags: [database, list_membership]
---

# 🗄 `wp.list_membership`

> [!abstract] Purpose
> Junction table linking creators to lists. Enables a creator to appear in multiple lists within a workspace.

## Columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary identifier |
| list_id | uuid | NOT NULL, FK → wp.list.id | Parent list |
| creator_id | uuid | NOT NULL, FK → gcp.creator.id | Creator in the list |
| added_by | uuid | FK → wp.app_user.id | User who added the creator |
| added_at | timestamptz | NOT NULL, DEFAULT now() | When creator was added |

## Indexes

| Name | Columns | Type | Rationale |
|---|---|---|---|
| idx_lm_list_creator | list_id, creator_id | UNIQUE | No duplicate entries in a list |
| idx_lm_creator | creator_id | Btree | All lists containing a creator |

## Relationships

- **[[wp.list]]** → `list_id` FK (many-to-one): Parent list
- **[[gcp.creator]]** → `creator_id` FK (many-to-one): Creator being listed
- **[[wp.app-user]]** → `added_by` FK (many-to-one): User who added creator

## Lifecycle & Retention

- Cascade delete when parent list is deleted
- No soft-delete; removal is hard delete
