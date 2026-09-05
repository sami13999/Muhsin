---
title: "ADR-020: Transactional Outbox"
type: adr
status: accepted
date: 2026-07-05
tags: [adr, architecture, outbox, events]
---

# ADR-020: Transactional Outbox

## Status

Accepted

## Context

Modules need to emit events when state changes. Direct queue publishing risks lost events (crash between write and publish) or phantom events (publish without committed write).

## Decision

**Modules never publish directly to the queue.** State change and its events are written atomically to the module's DB transaction (outbox table). A relay publishes to the queue and marks dispatched.

```
BEGIN;
  -- state change
  INSERT INTO gcp.creator (...);
  -- event in same transaction
  INSERT INTO platform.outbox (event_type, payload, ...);
COMMIT;
-- relay later: SELECT ... FOR UPDATE SKIP LOCKED → publish to SQS → mark dispatched_at
```

## Consequences

### Positive

- No phantom events (emitted without commit)
- No lost events (committed without emission)
- At-least-once delivery (relay lag is monitored, target p95 < 2s)
- Consumers must be idempotent (processed_event_ledger per consumer group)

### Negative

- Eventual delivery (relay lag introduces delay)
- Relay is a single point of failure (monitored, alerting)

## Relay Query Pattern

```sql
SELECT * FROM platform.outbox
WHERE dispatched_at IS NULL
ORDER BY created_at
LIMIT 100
FOR UPDATE SKIP LOCKED;
```

## Related

- Doc 16 Part A (Event fundamentals)
- `platform.outbox` table (V003 migration)
- `platform.processed_event_ledger` table (idempotency)
