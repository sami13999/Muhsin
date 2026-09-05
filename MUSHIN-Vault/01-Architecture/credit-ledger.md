---
title: "Credit Ledger — ADR-026 Implementation"
status: Active
last_updated: 2026-07-07
tags: [architecture, billing, credit, adr-026, doc-10]
---

# Credit Ledger — ADR-026 Implementation

**Source:** Doc 10 FS-08.03, ADR-026 | **Module:** M10

## Overview

The credit ledger implements the reserve-commit-release pattern for all metered actions. It uses `SELECT ... FOR UPDATE` on the balance row to prevent overdraft under concurrent access (ADR-026).

## Reserve-Commit-Release Flow

```
1. User triggers metered action → credit quote shown
2. User confirms → SELECT FOR UPDATE on workspace_credit_balance (ADR-026)
3. Reserve credits → credit_ledger_entry (type: reserve, amount: -N)
4. Job executes...
5a. Success → commit → ledger entry (type: commit)
5b. Failure → release → ledger entry (type: release, amount: +N) → balance restored
```

## Concurrency Contract (ADR-026)

```sql
BEGIN;
SELECT balance, version FROM wp.workspace_credit_balance
  WHERE workspace_id = $1 FOR UPDATE;  -- row-level write lock
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
- All credit operations use `SELECT ... FOR UPDATE` (row-level lock)
- Ledger entries use raw SQL for partitioned table inserts
- Version column enables optimistic locking

## Repository Methods

**File:** `packages/database/src/repositories/credit.repository.ts`

| Method | Description |
|---|---|
| `getBalance(db, workspaceId)` | Read balance + version |
| `reserveCredits(db, workspaceId, amount, refType, refId)` | FOR UPDATE → check → deduct → insert reserve entry |
| `commitCredits(db, workspaceId, amount, refType, refId, costSnapshot?)` | Insert commit entry |
| `releaseCredits(db, workspaceId, amount, refType, refId)` | FOR UPDATE → add back → insert release entry |
| `grantCredits(db, workspaceId, amount, entryType, period?, desc?)` | For allowance/topup/promo |
| `expireCredits(db, workspaceId, amount, period)` | For allowance expiry (never go negative) |

## Partitioned Table

`credit_ledger_entry` is monthly range partitioned on `created_at`. Inserts use raw SQL since Drizzle doesn't handle PostgreSQL partition routing. Partitions are pre-created M+2.

## Implementation Files

- Repository: `packages/database/src/repositories/credit.repository.ts`
- Drizzle schema: `packages/database/src/schema/wp/index.ts`
- Migration: `supabase/migrations/V004__wp_core_schema.sql`
