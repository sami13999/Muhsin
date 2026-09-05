---
title: "Platform Schema — System Infrastructure"
status: Active
last_updated: 2026-07-06
tags: [database, platform, schema, outbox, doc-19]
---

# Platform Schema — System Infrastructure

**Source:** Doc 19 Part K | **Migration:** V003 | **Schema:** `platform`

The platform schema contains system infrastructure tables: the transactional outbox for reliable event emission, the idempotency ledger for consumer groups, and supporting reference tables.

---

## Tables

### `platform.outbox` (ADR-020)

Transactional outbox for reliable event emission. Modules write events here atomically with their state changes. A relay polls and publishes to the queue.

| Column | Type | Notes |
|---|---|---|
| `outbox_id` | UUID PK | |
| `event_id` | UUID UNIQUE | Domain event ID (idempotency key) |
| `event_type` | TEXT | e.g. `discovery.job_queued` |
| `schema_version` | TEXT | Default `'1'` |
| `scope_class` | `scope_class_enum` | `gcp` / `wp` / `platform` |
| `workspace_id` | UUID | NULL for GCP/platform events |
| `actor_type` | TEXT | `user` / `system` / `ai` / `staff_impersonated` |
| `actor_id` | TEXT | |
| `correlation_id` | UUID | Job/flow linkage |
| `causation_id` | UUID | Triggering event |
| `payload` | JSONB | Event-specific data |
| `created_at` | TIMESTAMPTZ | |
| `dispatched_at` | TIMESTAMPTZ | NULL = pending dispatch |
| `dispatch_attempts` | INTEGER | Retry counter |

**Relay query pattern (SKIP LOCKED):**
```sql
SELECT * FROM platform.outbox
WHERE dispatched_at IS NULL
ORDER BY created_at
LIMIT 100
FOR UPDATE SKIP LOCKED;
```

**Index:** `idx_outbox_pending` — partial on `created_at WHERE dispatched_at IS NULL`

---

### `platform.processed_event_ledger` (ADR-020, Doc 16 A3)

Per-consumer-group idempotency registry. Before processing an event, consumer checks this table. If found: skip (duplicate). If not found: process then insert — in the same DB transaction as the side-effect.

| Column | Type | Notes |
|---|---|---|
| `consumer_group` | TEXT PK | Format: `{module_id}:{event_type}` |
| `event_id` | UUID PK | |
| `processed_at` | TIMESTAMPTZ | |

---

### `platform.niche_vocab`

48-category controlled vocabulary for niche classification (Doc 18 Part H). See V002 migration for seed data.

---

## Drizzle ORM

Schema definitions: `mushin-2.0/packages/database/src/schema/platform/index.ts`
