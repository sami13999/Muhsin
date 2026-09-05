---
title: wp.reveal
type: schema
plane: wp
date: 2026-07-05
status: draft
tags: [database, reveal]
---

# 🗄 `wp.reveal`

> [!abstract] Purpose
> Tracks when a user reveals (unlocks) a creator's private contact information. Each reveal is a billable event consuming credits from the workspace balance.

## Columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary identifier |
| workspace_id | uuid | NOT NULL, FK → wp.workspace.id | Owning workspace |
| user_id | uuid | NOT NULL, FK → wp.app_user.id | User who performed the reveal |
| creator_id | uuid | NOT NULL, FK → gcp.creator.id | Creator whose info was revealed |
| reveal_type | text | NOT NULL | Enum: email, phone, social_handle, full_profile |
| credits_consumed | integer | NOT NULL | Number of credits charged |
| created_at | timestamptz | NOT NULL, DEFAULT now() | When reveal occurred |

## Indexes

| Name | Columns | Type | Rationale |
|---|---|---|---|
| idx_reveal_workspace | workspace_id | Btree | All reveals in workspace |
| idx_reveal_user | user_id | Btree | Reveals by user |
| idx_reveal_creator | creator_id | Btree | Who revealed this creator |
| idx_reveal_created | created_at | Btree | Time-based queries |

## Relationships

- **[[wp.workspace]]** → `workspace_id` FK (many-to-one): Parent workspace
- **[[wp.app-user]]** → `user_id` FK (many-to-one): Revealing user
- **[[gcp.creator]]** → `creator_id` FK (many-to-one): Revealed creator
- **[[wp.credit-ledger-entry]]** → via reveal_id (one-to-one): Billing entry for this reveal

## Lifecycle & Retention

- Immutable — reveals cannot be undone or refunded automatically
- Each reveal creates a corresponding [[02-Database/tables/wp/wp.credit-ledger-entry|wp.credit_ledger_entry]] debit
- Re-reveals of same creator by same user are idempotent (no double charge)
- Retained indefinitely for billing audit
