---
type: table-spec
schema: wp
status: Active
created: 2026-07-09
tags: [database, billing, webhook]
---

# wp.paddle_webhook_raw

Raw webhook storage for idempotency and audit trail.

## Purpose

Stores raw Paddle webhook payloads before processing. Webhook verification happens before insert; raw payload stored for debugging and replay if needed.

## Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `webhook_id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `paddle_event_id` | TEXT | NO | — | Paddle's own event ID (unique, idempotency key) |
| `event_type` | TEXT | NO | — | Webhook event type |
| `raw_payload` | JSONB | NO | — | Raw webhook payload |
| `signature` | TEXT | NO | — | Webhook signature for verification |
| `verified` | BOOLEAN | NO | `false` | Whether signature was verified |
| `processed_at` | TIMESTAMPTZ | YES | NULL | When processing completed (NULL = pending) |
| `processing_error` | TEXT | YES | NULL | Error message if processing failed |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Row creation time |

## Indexes

| Name | Columns | Condition |
|------|---------|-----------|
| `paddle_webhook_raw_pkey` | `webhook_id` | — |
| `paddle_webhook_raw_paddle_event_id_key` | `paddle_event_id` | — |
| `idx_paddle_webhook_pending` | `created_at` | `processed_at IS NULL` |
| `idx_paddle_webhook_event_type` | `event_type, created_at` | — |

## RLS

No RLS — system-level table accessed by webhook handler only.

## Related

- [[02-Database/tables/wp/wp.subscription-event|wp.subscription_event]] — normalized events derived from this table
- [[03-API/endpoints/M10-Billing/POST-webhooks-paddle|POST /webhooks/paddle]] — writes to this table
- [[08-Decisions/ADR-030-credit-reservation-subscription|ADR-030]] — subscription lifecycle
