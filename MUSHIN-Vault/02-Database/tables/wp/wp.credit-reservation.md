---
title: wp.credit_reservation
type: schema
plane: wp
date: 2026-07-05
status: draft
tags: [database, credit_reservation]
---

# 🗄 `wp.credit_reservation`

> [!abstract] Purpose
> Temporary holds on credits before a billable action completes. Reservations prevent overspending by pre-allocating credits, then converting to ledger entries on success or releasing on failure.

## Columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary identifier |
| workspace_id | uuid | NOT NULL, FK → wp.workspace.id | Owning workspace |
| amount | numeric(12,4) | NOT NULL, CHECK (amount > 0) | Reserved credit amount |
| reason | text | NOT NULL | What the reservation is for (e.g., "reveal_creator", "campaign_launch") |
| reference_type | text | | Polymorphic owner type |
| reference_id | uuid | | Polymorphic owner ID |
| status | text | NOT NULL, DEFAULT 'active' | Enum: active, consumed, released, expired |
| expires_at | timestamptz | NOT NULL | Auto-release time (default: 5 minutes) |
| consumed_at | timestamptz | | When converted to ledger entry |
| released_at | timestamptz | | When released (failed/expired) |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Reservation timestamp |

## Indexes

| Name | Columns | Type | Rationale |
|---|---|---|---|
| idx_cr_workspace_status | workspace_id, status | Btree | Active reservations per workspace |
| idx_cr_expires | expires_at | Btree | Expiry sweeper polling |
| idx_cr_reference | reference_type, reference_id | Btree | Reservation for an entity |

## Relationships

- **[[wp.workspace]]** → `workspace_id` FK (many-to-one): Parent workspace
- **[[wp.workspace-credit-balance]]** → workspace_id (indirect): Reserved amount subtracted from available balance
- **[[wp.credit-ledger-entry]]** → workspace_id (indirect): Consumed reservations create ledger entries

## Lifecycle & Retention

- On creation: `UPDATE workspace_credit_balance SET reserved = reserved + amount WHERE workspace_id = ?`
- On consume: `UPDATE workspace_credit_balance SET balance = balance - amount, reserved = reserved - amount`
- On release: `UPDATE workspace_credit_balance SET reserved = reserved - amount`
- Expiry sweeper runs every 60s via [[04-Functions/workers/sweeper|sweeper]], releases expired reservations
- Retained for 30 days post-completion for audit
