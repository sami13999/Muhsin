---
title: "Partitioning Strategy"
status: Active
last_updated: 2026-07-07
tags: [database, partitioning, postgresql, doc-19]
---

# Partitioning Strategy

## Key Correction

**PostgreSQL routes INSERTs to the correct partition transparently.** Drizzle's `.insert()` works fine on partitioned tables. Raw SQL is only needed for partition management (CREATE/DROP), not data operations.

This means:
- `db.insert(creditLedgerEntry).values(...)` works correctly — PostgreSQL routes to the right monthly partition
- `db.insert(interactionTimeline).values(...)` works correctly — same transparent routing
- Raw SQL is only needed for `CREATE TABLE ... PARTITION OF ...` (partition creation jobs)

## Partitioned Tables

| Table | Partition Key | Partition Type | Granularity |
|---|---|---|---|
| `gcp.enrichment_snapshot` | `created_at` | Range | Monthly |
| `wp.credit_ledger_entry` | `created_at` | Range | Monthly |
| `wp.interaction_timeline` | `created_at` | Range | Monthly |

## Partition Pre-Creation Policy

**M+2 policy (Doc 19 Part M1):** A scheduled job runs on the **15th of each month** and creates partitions for **month+2** (two months ahead). This provides a safety buffer against job failures.

For example, on July 15:
- Create partition for September (`_2026_09`)
- The July and August partitions already exist

## Partition Naming Convention

```
{table_name}_{YYYY}_{MM}
```

Examples:
- `wp.credit_ledger_entry_2026_07`
- `wp.interaction_timeline_2026_08`

## Partition Archival (Cold-Tier Migration)

Partitions older than 24 months are detached from the parent table and attached to a cold-tier archive tablespace (Doc 22). The detach + reattach is a metadata operation and does not require downtime.

## Drizzle Schema

Partitioned tables are defined in Drizzle for type generation purposes. The Drizzle schema includes the composite primary key (`id` + `created_at`) required by PostgreSQL for partitioned tables.

## Implementation Files

- WP schema: `packages/database/src/schema/wp/index.ts`
- GCP schema: `packages/database/src/schema/gcp/index.ts`
- Migration: `supabase/migrations/V004__wp_core_schema.sql`
