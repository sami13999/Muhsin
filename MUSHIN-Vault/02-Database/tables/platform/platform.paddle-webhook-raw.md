---
title: platform.paddle_webhook_raw
type: schema
plane: platform
date: 2026-07-05
status: draft
tags: [database, paddle_webhook_raw]
---

# 🗄 `platform.paddle_webhook_raw`

> [!abstract] Purpose
> Raw storage of all incoming Paddle webhook payloads. Preserves the original webhook data for debugging, replay, and audit before transformation into domain events.

## Columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary identifier |
| paddle_event_id | text | NOT NULL, UNIQUE | Paddle's unique event identifier |
| event_type | text | NOT NULL | Paddle event name: subscription_created, payment_succeeded, etc. |
| payload | jsonb | NOT NULL | Full raw webhook payload |
| signature | text | NOT NULL | HMAC signature for verification |
| status | text | NOT NULL, DEFAULT 'received' | Enum: received, processed, failed, ignored |
| processed_at | timestamptz | | When domain event was created |
| error | jsonb | | Processing error details |
| received_at | timestamptz | NOT NULL, DEFAULT now() | When webhook was received |

## Indexes

| Name | Columns | Type | Rationale |
|---|---|---|---|
| idx_pwr_paddle_id | paddle_event_id | UNIQUE | Idempotency — one record per Paddle event |
| idx_pwr_status | status | Btree | Find unprocessed webhooks |
| idx_pwr_type | event_type | Btree | Filter by event type |
| idx_pwr_received | received_at | Btree | Time-based queries |

## Relationships

- No FK relationships — raw webhook storage
- **[[wp.paddle-subscription]]** → paddle_subscription_id (indirect): Subscription updates
- **[[wp.entitlement-catalog]]** → via plan_code (indirect): Plan changes
- **[[platform.processed-event-ledger]]** → paddle_event_id (indirect): Idempotency tracking

## Lifecycle & Retention

- **Idempotency:** INSERT ON CONFLICT (paddle_event_id) DO NOTHING
- Processed by platform webhook handler → creates domain events in [[02-Database/tables/platform/platform.outbox|platform.outbox]]
- Retained for 12 months for audit and debugging
- Payloads are immutable — never updated after receipt
- Processing tracked in [[02-Database/tables/platform/platform.processed-event-ledger|platform.processed_event_ledger]]
