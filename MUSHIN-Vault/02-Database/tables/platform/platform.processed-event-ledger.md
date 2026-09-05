---
title: platform.processed_event_ledger
type: schema
plane: platform
date: 2026-07-05
status: draft
tags: [database, processed_event_ledger]
---

# 🗄 `platform.processed_event_ledger`

> [!abstract] Purpose
> Idempotency ledger tracking which inbound events have been processed. Prevents duplicate processing of webhook events, outbox messages, and external notifications.

## Columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary identifier |
| event_source | text | NOT NULL | Source system: paddle, wp_webhook, outbox, gmail, outlook |
| event_id | text | NOT NULL | Source-specific event identifier |
| processed_at | timestamptz | NOT NULL, DEFAULT now() | When event was processed |
| handler | text | NOT NULL | Which handler processed the event |
| result | text | NOT NULL, DEFAULT 'success' | Enum: success, failure, skipped |
| error | jsonb | | Error details if result = 'failure' |
| processing_duration_ms | integer | | Handler execution time |

## Indexes

| Name | Columns | Type | Rationale |
|---|---|---|---|
| idx_pel_source_event | event_source, event_id | UNIQUE | Idempotency check — one processing per event |
| idx_pel_processed | processed_at | Btree | Time-based queries |
| idx_pel_handler | handler | Btree | Handler-specific queries |

## Relationships

- No FK relationships — event metadata only
- **[[platform.outbox]]** → event_id (indirect): Outbox events processed
- **[[platform.paddle-webhook-raw]]** → event_id (indirect): Paddle webhooks processed

## Lifecycle & Retention

- **Idempotency:** `INSERT ... ON CONFLICT (event_source, event_id) DO NOTHING` — skip duplicates
- Processed by [[04-Functions/workers/outbox-relay|outbox-relay]] and other handlers
- Retained for 90 days for debugging and audit
- Partitioned by `processed_at` (monthly) for query performance
- Source events from [[02-Database/tables/platform/platform.outbox|platform.outbox]] and [[02-Database/tables/platform/platform.paddle-webhook-raw|platform.paddle_webhook_raw]]
