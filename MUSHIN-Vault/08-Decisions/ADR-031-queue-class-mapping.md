---
type: adr
status: Accepted
date: 2026-07-09
module: Events
related_docs: ["DOC-016", "DOC-022"]
tags: [adr, events, queues, infrastructure]
---

# ADR-031: Queue-Class-to-Infrastructure Mapping

## Context

[[01-Architecture/DOC-016-Data-Flow-Event-Architecture|DOC-016]] defines abstract queue classes; [[06-Operations/DOC-022-Infrastructure-Deployment|DOC-022]] implements concrete SQS queues. They don't map 1:1 — DOC-016 has no `erasure` class even though `q-erasure` exists in infra, and DOC-016's `webhooks` class has no corresponding named queue.

## Decision

| Abstract class (DOC-016) | Concrete queue (DOC-022) | Note |
|---|---|---|
| `interactive` | `q-discovery-high` | Direct match — user-waiting, highest priority |
| `discovery-bulk` | `q-discovery-standard` | Direct match — live search fan-out |
| `scheduled` | `q-rescore-low` | Direct match — PATCH-010 re-scoring |
| `events` | `q-outbox-relay` | Direct match — outbox relay is the event-transport mechanism |
| `webhooks` | *(no dedicated queue — synchronous)* | Inbound webhook verification happens synchronously at the gateway |
| *(new)* `erasure` | `q-erasure` | Formalized: erasure jobs get their own class because they have a distinct 72-hour regulatory SLA |

## Amendments

- **DOC-016:** add `erasure` as a sixth queue class alongside the original five
- **DOC-022:** no infra change needed — `q-erasure` already exists

## Implementation

- **Outbox relay:** `packages/events/src/relay.ts` — FOR UPDATE SKIP LOCKED pattern
- **Worker framework:** `apps/workers/src/worker.ts` — SQS consumption with idempotency
- **Event taxonomy:** `packages/events/src/taxonomy.ts` — 40+ event types across 10 families

## Related

- [[08-Decisions/ADR-020-transactional-outbox|ADR-020]] (Transactional Outbox)
- [[01-Architecture/DOC-016-Data-Flow-Event-Architecture|DOC-016]]
- [[06-Operations/DOC-022-Infrastructure-Deployment|DOC-022]]
