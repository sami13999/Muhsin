---
title: platform.outbox
type: schema
plane: platform
date: 2026-07-05
status: draft
tags: [database, outbox]
---

# 🗄 `platform.outbox`

> [!abstract] Purpose
> Transactional outbox for reliable event publishing. Events are written atomically with business transactions, then relayed to message brokers by the outbox-relay worker.

## Columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary identifier |
| event_type | text | NOT NULL | Event name: creator.revealed, campaign.created, credit.debited, etc. |
| aggregate_type | text | NOT NULL | Entity type: creator, campaign, workspace, credit |
| aggregate_id | uuid | NOT NULL | Entity ID the event relates to |
| payload | jsonb | NOT NULL | Event data (serialized domain event) |
| status | text | NOT NULL, DEFAULT 'pending' | Enum: pending, published, failed |
| retry_count | integer | NOT NULL, DEFAULT 0 | Number of publish attempts |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Event creation timestamp |
| published_at | timestamptz | | When successfully published to broker |

## Indexes

| Name | Columns | Type | Rationale |
|---|---|---|---|
| idx_outbox_pending | id | Btree WHERE status = 'pending' | **Partial index** — outbox-relay polling query |
| idx_outbox_aggregate | aggregate_type, aggregate_id | Btree | Events for a specific entity |
| idx_outbox_created | created_at | Btree | Time-based queries |
| idx_outbox_type | event_type | Btree | Filter by event type |

## Relationships

- No FK relationships — event data is self-contained
- **[[platform.processed-event-ledger]]** → event_type (indirect): Idempotency tracking
- **[[wp.workspace]]** → aggregate_id (indirect, when aggregate_type = 'workspace')
- **[[gcp.creator]]** → aggregate_id (indirect, when aggregate_type = 'creator')

## Lifecycle & Retention

- **Outbox relay pattern:** `SELECT ... FROM platform.outbox WHERE status = 'pending' ORDER BY created_at LIMIT 100 FOR UPDATE SKIP LOCKED`
- **Publishing:** Relay publishes to broker via [[04-Functions/workers/outbox-relay|outbox-relay]], then `UPDATE status = 'published', published_at = now()`
- **Retry:** Max 5 retries with exponential backoff; status → 'failed' after exhaustion
- **Retention:** Published events purged after 7 days; failed events retained for 30 days
- Written atomically within business transaction (same DB, same connection)
- Idempotency tracked in [[02-Database/tables/platform/platform.processed-event-ledger|platform.processed_event_ledger]]
