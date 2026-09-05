---
type: worker
name: outbox-relay
status: active
created: 2026-07-05
tags: [worker, outbox, events]
---

# Outbox Relay Worker

## Purpose

Relay events from the transactional outbox to external message brokers. Ensures reliable event delivery with at-least-once semantics.

## Flow

1. Poll [[02-Database/tables/platform/platform.outbox|platform.outbox]] for pending events
2. Fetch batch using `SELECT ... FOR UPDATE SKIP LOCKED`
3. Publish each event to message broker
4. Mark as published or increment retry count
5. Purge events older than 7 days

## Configuration

| Parameter | Value | Source |
|-----------|-------|--------|
| Polling interval | 5 seconds | Doc-16 |
| Batch size | 100 | Doc-16 |
| Max retries | 5 | Doc-19 |
| Retention | 7 days | Doc-19 |

## Event Types

See `EventTypes` constant in `packages/shared/src/services/outbox.ts`:

- `workspace.created` / `updated` / `deleted`
- `creator.added_to_workspace` / `enrichment_triggered`
- `campaign.created` / `completed`
- `credit.reserved` / `committed` / `released`
- `consent.granted` / `revoked`
- `discovery.job_created` / `completed`

## Tables Accessed

| Table | Operation | Purpose |
|-------|-----------|---------|
| [[02-Database/tables/platform/platform.outbox\|platform.outbox]] | Read/Write | Event queue |
| [[02-Database/tables/platform/platform.processed-event-ledger\|platform.processed_event_ledger]] | Write | Idempotency tracking |

## Error Handling

- Failed events: increment retry_count, keep status='pending'
- After 5 retries: status='failed', retained for 30 days
- Worker crash: FOR UPDATE SKIP LOCKED prevents duplicate processing

## References

- [[03-API/Doc-20-API-Design|API Design]] - Part A1: Write-path isolation
- [[01-Architecture/Doc-16-Event-architecture|Event Architecture]] - Outbox pattern
- [[02-Database/tables/platform/platform.outbox|platform.outbox]]
