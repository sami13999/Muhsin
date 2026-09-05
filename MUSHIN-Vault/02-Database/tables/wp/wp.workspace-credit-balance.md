---
title: wp.workspace_credit_balance
type: schema
plane: wp
date: 2026-07-05
status: draft
tags: [database, workspace_credit_balance]
---

# 🗄 `wp.workspace_credit_balance`

> [!abstract] Purpose
> Materialized credit balance per workspace. Updated atomically via `SELECT FOR UPDATE` to prevent race conditions (ADR-026). Includes `version` column for optimistic concurrency control.

## Columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary identifier |
| workspace_id | uuid | NOT NULL, FK → wp.workspace.id, UNIQUE | One balance per workspace |
| balance | numeric(12,4) | NOT NULL, DEFAULT 0 | Current available credits |
| reserved | numeric(12,4) | NOT NULL, DEFAULT 0 | Credits held by active reservations |
| lifetime_consumed | numeric(12,4) | NOT NULL, DEFAULT 0 | Total credits ever consumed (monotonic) |
| version | integer | NOT NULL, DEFAULT 1 | Optimistic lock; incremented on every mutation |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | Last balance change |

## Indexes

| Name | Columns | Type | Rationale |
|---|---|---|---|
| idx_wcb_workspace | workspace_id | UNIQUE | Single balance row per workspace |
| idx_wcb_updated | updated_at | Btree | Find stale balances for reconciliation |

## Relationships

- **[[wp.workspace]]** → `workspace_id` FK (one-to-one): Owning workspace
- **[[wp.credit-ledger-entry]]** → workspace_id (one-to-many): Source of truth for balance
- **[[wp.credit-reservation]]** → workspace_id (one-to-many): Active reservations
- **[[wp.reveal]]** → workspace_id (indirect): Reveals consume credits from this balance

## Lifecycle & Retention

- **Concurrency (ADR-026):** All balance mutations use `SELECT ... FOR UPDATE` to serialize access
- **Version check:** Optimistic lock via `version` column; retry on version mismatch
- **Reconciliation:** Nightly job recomputes balance from [[02-Database/tables/wp/wp.credit-ledger-entry|wp.credit_ledger_entry]] SUM; alerts on drift > 0.001
- Balance row created on workspace provisioning; never deleted
