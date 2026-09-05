---
type: table-spec
schema: wp
status: Active
created: 2026-07-09
tags: [database, billing, events]
---

# wp.subscription_event

Normalized billing events. Immutable, append-only.

## Purpose

Derived from `paddle_webhook_raw` after verification. Records all subscription lifecycle events (created, updated, cancelled, payment succeeded/failed) with workspace association.

## Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `event_id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `workspace_id` | UUID | NO | — | FK to `wp.workspace` (CASCADE delete) |
| `subscription_id` | TEXT | NO | — | Paddle subscription ID |
| `event_type` | TEXT | NO | — | Event type (subscription_created, etc.) |
| `status` | TEXT | YES | NULL | Subscription status at time of event |
| `price_id` | TEXT | YES | NULL | Paddle price ID |
| `customer_id` | TEXT | YES | NULL | Paddle customer ID |
| `amount` | BIGINT | YES | NULL | Amount in smallest currency unit (cents) |
| `currency` | TEXT | YES | `'USD'` | Currency code |
| `metadata` | JSONB | YES | `'{}'` | Additional event metadata |
| `paddle_event_id` | TEXT | YES | NULL | Reference to raw webhook for audit trail |
| `occurred_at` | TIMESTAMPTZ | NO | — | When the event occurred (from Paddle) |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Row creation time |

## Indexes

| Name | Columns |
|------|---------|
| `subscription_event_pkey` | `event_id` |
| `idx_subscription_event_workspace` | `workspace_id, created_at` |
| `idx_subscription_event_sub` | `subscription_id, created_at` |
| `idx_subscription_event_type` | `event_type, created_at` |

## RLS

Workspace-scoped via `app.current_workspace_id`.

- `subscription_event_select` — SELECT where `workspace_id` matches
- `subscription_event_insert` — INSERT where `workspace_id` matches

## Related

- [[02-Database/tables/wp/wp.paddle-webhook-raw|wp.paddle_webhook_raw]] — raw webhook source
- [[02-Database/tables/wp/wp.workspace|wp.workspace]] — workspace reference
- [[08-Decisions/ADR-030-credit-reservation-subscription|ADR-030]] — subscription lifecycle
