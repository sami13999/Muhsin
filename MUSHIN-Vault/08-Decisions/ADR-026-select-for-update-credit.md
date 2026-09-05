---
title: "ADR-026: SELECT FOR UPDATE on Credit Balance"
type: adr
status: accepted
date: 2026-07-05
tags: [adr, billing, credits, concurrency, doc-10]
---

# ADR-026: SELECT FOR UPDATE on Credit Balance

## Status

Accepted

## Context

Credit operations (reserve, commit, release) must be atomic. Concurrent requests could overdraft the balance if two transactions read the same balance and both deduct.

## Decision

**All credit operations use `SELECT ... FOR UPDATE` on the balance row.**

```sql
BEGIN;
  SELECT balance, version
    FROM wp.workspace_credit_balance
    WHERE workspace_id = $1
    FOR UPDATE;                          -- row-level write lock
  -- (application checks balance >= requested_amount)
  INSERT INTO wp.credit_ledger_entry (...) VALUES (...);
  UPDATE wp.workspace_credit_balance
    SET balance = balance - $amount, version = version + 1
    WHERE workspace_id = $1 AND version = $current_version;
  -- If UPDATE affects 0 rows: concurrent modification → retry (up to 3 times)
COMMIT;
```

**Key invariants:**
- Balance NEVER goes negative (hard CHECK constraint + application enforcement)
- Version column enables optimistic locking
- Ledger entries are append-only (immutable audit trail)
- Reservation TTL = 2× max job duration (PATCH-005)

## Consequences

### Positive

- Zero overdraft under any concurrency scenario
- Row-level lock is cheap (single row per workspace)
- Version column detects concurrent modification (retry)
- Append-only ledger provides complete audit trail

### Negative

- Serializes credit operations per workspace (acceptable at S1/S2 scale)
- Must handle retry on version mismatch

## Related

- Doc 10 FS-08.03 (Credit ledger)
- `wp.workspace_credit_balance` table
- `wp.credit_ledger_entry` table (partitioned)
