---
title: wp.credit_ledger_entry
type: schema
plane: wp
date: 2026-07-05
status: draft
tags: [database, credit_ledger_entry]
---

# 🗄 `wp.credit_ledger_entry`

> [!abstract] Purpose
> Double-entry accounting ledger tracking credit consumption and additions per workspace. All billing mutations are immutable append-only entries.

## Columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary identifier |
| workspace_id | uuid | NOT NULL, FK → wp.workspace.id | Owning workspace |
| entry_type | text | NOT NULL | Enum: debit, credit, refund, adjustment |
| amount | numeric(12,4) | NOT NULL, CHECK (amount > 0) | Always positive; direction via entry_type |
| balance_after | numeric(12,4) | NOT NULL | Running balance snapshot after this entry |
| reason | text | NOT NULL | Human-readable: "api_call", "storage_usage", "plan_renewal" |
| reference_id | text | | External ref (invoice ID, transaction ID) |
| idempotency_key | text | UNIQUE | Prevent duplicate entries |
| creator_id | uuid | FK → gcp.creator.id | User who triggered (NULL = system) |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Entry timestamp |

## Indexes

| Name | Columns | Type | Rationale |
|---|---|---|---|
| idx_cle_workspace_created | workspace_id, created_at DESC | Btree | Ledger history per workspace |
| idx_cle_idempotency | idempotency_key | UNIQUE | Idempotent billing operations |
| idx_cle_entry_type | entry_type | Btree | Filter by entry type |
| idx_cle_reference | reference_id | Btree | Lookups by external reference |

## Relationships

- **[[wp.workspace]]** → `workspace_id` FK (many-to-one): Parent workspace
- **[[gcp.creator]]** → `creator_id` FK (many-to-one): User context (nullable)
- **[[wp.workspace-credit-balance]]** → workspace_id (indirect): Balance derived from ledger SUM

## Lifecycle & Retention

- Immutable — no updates or deletes (regulatory compliance)
- Balance derived from SUM(amount) where entry_type IN ('credit', 'refund', 'adjustment') - SUM(debit)
- Retained indefinitely for financial audit trail
- Partitioned by `created_at` (quarterly)
- Consumed reservations from [[02-Database/tables/wp/wp.credit-reservation|wp.credit_reservation]] create ledger entries
