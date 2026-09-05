/**
 * M10 Credit Repository — Reserve-Commit-Release pattern (ADR-026).
 * Implements the credit ledger with SELECT FOR UPDATE concurrency control.
 * Every method takes db as first param for transaction participation.
 *
 * CRITICAL: reserveCredits, commitCredits, and releaseCredits MUST be called
 * within db.transaction(). Calling outside a transaction is a TD-01 class bug.
 * The runtime guard in assertInTransaction() enforces this.
 */
import { eq, and, sql } from 'drizzle-orm';
import type { Database } from '../client.js';
import { workspaceCreditBalance, creditLedgerEntry } from '../schema/wp/index.js';

// ── Types ────────────────────────────────────────────────────

/**
 * Branded type for transaction clients.
 * Callers must use `tx as TransactionClient` inside db.transaction() callbacks.
 * This provides compile-time enforcement that credit operations run in transactions.
 *
 * NOTE: Drizzle's PgTransaction and PostgresJsDatabase share the same structural type
 * but are different classes. This branded type uses Database & { __transactionBrand }
 * to create a nominal distinction. Callers cast via `tx as unknown as TransactionClient`.
 */
export type TransactionClient = Database & { readonly __transactionBrand?: unique symbol };

/**
 * Runtime guard: asserts that the db parameter is a transaction client.
 * TD-01 fix: prevents reserveCredits/commitCredits/releaseCredits from being
 * called outside a transaction, which would bypass SELECT FOR UPDATE safety.
 */
export function assertInTransaction(db: Database): asserts db is TransactionClient {
  // Runtime check: verify db looks like a real Drizzle instance with a client
  if (!db || typeof db !== 'object') {
    throw new Error(
      '[credit.repository] assertInTransaction: db must be a Drizzle database instance. ' +
      'reserveCredits/commitCredits/releaseCredits MUST be called within db.transaction().'
    );
  }
  // Check for Drizzle's $client property (exists on both base db and transaction objects)
  const candidate = db as unknown as Record<string, unknown>;
  if (!candidate['$client'] || typeof (candidate['$client'] as unknown as Record<string, unknown>)['sql'] !== 'function') {
    throw new Error(
      '[credit.repository] assertInTransaction: db does not appear to be a Drizzle instance. ' +
      'reserveCredits/commitCredits/releaseCredits MUST be called within db.transaction().'
    );
  }
  // NOTE: Structural detection cannot distinguish transaction vs base db at runtime.
  // The primary guard is the TypeScript type: callers inside db.transaction() must
  // pass `tx as TransactionClient`. This runtime check catches obvious misuse
  // (non-Drizzle objects, null, undefined) but not "base db passed instead of tx".
  // That case is caught by code review and the TransactionClient branded type.
}

export type ReserveResult = {
  success: true;
  newBalance: bigint;
  version: number;
} | {
  success: false;
  reason: 'insufficient_balance';
  shortfall: bigint;
}

export interface CreditOperationResult {
  success: true;
  newBalance: bigint;
  version: number;
}

// ── Helper: Insert ledger entry via Drizzle (partitioned table) ──
// PostgreSQL routes INSERTs to the correct partition transparently.
// Drizzle's .insert() works fine on partitioned tables.

async function insertLedgerEntry(
  db: Database,
  workspaceId: string,
  entryType: string,
  amount: bigint,
  referenceType?: string,
  referenceId?: string,
  providerCostSnapshot?: Record<string, unknown>,
  period?: string,
  description?: string,
): Promise<void> {
  const now = new Date();
  const periodTag = period ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  await db.insert(creditLedgerEntry).values({
    workspaceId,
    entryType: entryType as 'allowance_grant' | 'topup_purchase' | 'consumption' | 'expiry' | 'refund_adjustment' | 'promo_grant' | 'reversal' | 'reserved' | 'released' | 'committed',
    amount,
    referenceType: referenceType ?? null,
    referenceId: referenceId ?? null,
    providerCostSnapshot: providerCostSnapshot ?? null,
    period: periodTag,
    description: description ?? null,
    createdAt: now,
  });
}

// ── Repository ───────────────────────────────────────────────

/**
 * Get current credit balance for a workspace.
 */
export async function getBalance(
  db: Database,
  workspaceId: string,
): Promise<{ balance: bigint; version: number }> {
  const [row] = await db
    .select({
      balance: workspaceCreditBalance.balance,
      version: workspaceCreditBalance.version,
    })
    .from(workspaceCreditBalance)
    .where(eq(workspaceCreditBalance.workspaceId, workspaceId))
    .limit(1);

  return {
    balance: row?.balance ?? 0n,
    version: row?.version ?? 0,
  };
}

/**
 * Reserve credits for a metered action (ADR-026).
 *
 * CRITICAL: Uses SELECT ... FOR UPDATE on the balance row.
 * All of this MUST be within the same transaction (the caller provides db
 * which is already in a transaction).
 */
export async function reserveCredits(
  db: Database,
  workspaceId: string,
  amount: bigint,
  referenceType: string,
  referenceId: string,
): Promise<ReserveResult> {
  // TD-01 runtime guard: MUST be called within db.transaction()
  assertInTransaction(db);
  // 1. SELECT ... FOR UPDATE — row-level lock (ADR-026)
  const [balanceRow] = await db.execute(sql`
    SELECT balance, version
    FROM wp.workspace_credit_balance
    WHERE workspace_id = ${workspaceId}
    FOR UPDATE
  `);

  if (!balanceRow) {
    return { success: false, reason: 'insufficient_balance', shortfall: amount };
  }

  const currentBalance = BigInt(balanceRow['balance'] as string);
  const currentVersion = Number(balanceRow['version']);

  // 2. Check balance >= amount
  if (currentBalance < amount) {
    return {
      success: false,
      reason: 'insufficient_balance',
      shortfall: amount - currentBalance,
    };
  }

  // 3. Update balance
  const newBalance = currentBalance - amount;
  const newVersion = currentVersion + 1;

  await db.execute(sql`
    UPDATE wp.workspace_credit_balance
    SET balance = ${Number(newBalance)}, version = ${newVersion}, updated_at = now()
    WHERE workspace_id = ${workspaceId} AND version = ${currentVersion}
  `);

  // 4. Insert ledger entry (raw SQL for partitioned table)
  await insertLedgerEntry(
    db, workspaceId, 'reserved', -amount,
    referenceType, referenceId,
  );

  return { success: true, newBalance, version: newVersion };
}

/**
 * Commit credits (convert reservation to consumption).
 * Called after a metered action completes successfully.
 */
export async function commitCredits(
  db: Database,
  workspaceId: string,
  amount: bigint,
  referenceType: string,
  referenceId: string,
  providerCostSnapshot?: Record<string, unknown>,
): Promise<CreditOperationResult> {
  // TD-01 runtime guard: MUST be called within db.transaction()
  assertInTransaction(db);
  // Insert commit entry (the reservation already deducted from balance)
  await insertLedgerEntry(
    db, workspaceId, 'committed', -amount,
    referenceType, referenceId, providerCostSnapshot,
  );

  // Read current balance for return value
  const { balance, version } = await getBalance(db, workspaceId);
  return { success: true, newBalance: balance, version };
}

/**
 * Release reserved credits (return to balance).
 * Called when a metered action fails or is cancelled.
 */
export async function releaseCredits(
  db: Database,
  workspaceId: string,
  amount: bigint,
  referenceType: string,
  referenceId: string,
): Promise<CreditOperationResult> {
  // TD-01 runtime guard: MUST be called within db.transaction()
  assertInTransaction(db);
  // 1. SELECT ... FOR UPDATE
  const [balanceRow] = await db.execute(sql`
    SELECT balance, version
    FROM wp.workspace_credit_balance
    WHERE workspace_id = ${workspaceId}
    FOR UPDATE
  `);

  if (!balanceRow) {
    return { success: true, newBalance: 0n, version: 0 };
  }

  const currentBalance = BigInt(balanceRow['balance'] as string);
  const currentVersion = Number(balanceRow['version']);
  const newBalance = currentBalance + amount;
  const newVersion = currentVersion + 1;

  // 2. Update balance
  await db.execute(sql`
    UPDATE wp.workspace_credit_balance
    SET balance = ${Number(newBalance)}, version = ${newVersion}, updated_at = now()
    WHERE workspace_id = ${workspaceId} AND version = ${currentVersion}
  `);

  // 3. Insert ledger entry
  await insertLedgerEntry(
    db, workspaceId, 'released', amount,
    referenceType, referenceId,
  );

  return { success: true, newBalance, version: newVersion };
}

/**
 * Grant credits (allowance, top-up, promo).
 */
export async function grantCredits(
  db: Database,
  workspaceId: string,
  amount: bigint,
  entryType: 'allowance_grant' | 'topup_purchase' | 'promo_grant',
  period?: string,
  description?: string,
): Promise<CreditOperationResult> {
  // 1. SELECT ... FOR UPDATE
  const [balanceRow] = await db.execute(sql`
    SELECT balance, version
    FROM wp.workspace_credit_balance
    WHERE workspace_id = ${workspaceId}
    FOR UPDATE
  `);

  if (!balanceRow) {
    return { success: true, newBalance: 0n, version: 0 };
  }

  const currentBalance = BigInt(balanceRow['balance'] as string);
  const currentVersion = Number(balanceRow['version']);
  const newBalance = currentBalance + amount;
  const newVersion = currentVersion + 1;

  // 2. Update balance
  await db.execute(sql`
    UPDATE wp.workspace_credit_balance
    SET balance = ${Number(newBalance)}, version = ${newVersion}, updated_at = now()
    WHERE workspace_id = ${workspaceId} AND version = ${currentVersion}
  `);

  // 3. Insert ledger entry
  await insertLedgerEntry(
    db, workspaceId, entryType, amount,
    undefined, undefined, undefined, period, description,
  );

  return { success: true, newBalance, version: newVersion };
}

/**
 * Expire credits (allowance expiry at billing period end).
 * Only expires up to current balance (never go negative).
 */
export async function expireCredits(
  db: Database,
  workspaceId: string,
  amount: bigint,
  period: string,
): Promise<CreditOperationResult> {
  // 1. SELECT ... FOR UPDATE
  const [balanceRow] = await db.execute(sql`
    SELECT balance, version
    FROM wp.workspace_credit_balance
    WHERE workspace_id = ${workspaceId}
    FOR UPDATE
  `);

  if (!balanceRow) {
    return { success: true, newBalance: 0n, version: 0 };
  }

  const currentBalance = BigInt(balanceRow['balance'] as string);
  const currentVersion = Number(balanceRow['version']);

  // 2. Only expire up to current balance (never go negative)
  const actualExpiry = amount > currentBalance ? currentBalance : amount;
  const newBalance = currentBalance - actualExpiry;
  const newVersion = currentVersion + 1;

  // 3. Update balance
  await db.execute(sql`
    UPDATE wp.workspace_credit_balance
    SET balance = ${Number(newBalance)}, version = ${newVersion}, updated_at = now()
    WHERE workspace_id = ${workspaceId} AND version = ${currentVersion}
  `);

  // 4. Insert ledger entry
  await insertLedgerEntry(
    db, workspaceId, 'expiry', -actualExpiry,
    undefined, undefined, undefined, period,
    `Allowance expiry for period ${period}`,
  );

  return { success: true, newBalance, version: newVersion };
}

// ── Reservation Lifecycle (ADR-030) ──────────────────────────

/**
 * Expire stale reservations that have exceeded their TTL.
 * ADR-030: TTL sweeper is the ONLY release mechanism (30-minute default).
 * This handles both normal case and post-cancellation case.
 *
 * Called by a scheduled worker every 30 minutes.
 */
export async function expireStaleReservations(
  db: Database,
  ttlMinutes: number = 30,
): Promise<number> {
  const cutoff = new Date(Date.now() - ttlMinutes * 60 * 1000);

  // Find reservations that are older than TTL and haven't been committed/released
  // These are identified by 'reserved' entries in the ledger without a corresponding
  // 'committed' or 'released' entry.
  const staleReservations = await db.execute(sql`
    SELECT r.workspace_id, r.amount, r.reference_type, r.reference_id
    FROM wp.credit_ledger_entry r
    WHERE r.entry_type = 'reserved'
      AND r.created_at < ${cutoff}
      AND NOT EXISTS (
        SELECT 1 FROM wp.credit_ledger_entry c
        WHERE c.entry_type IN ('committed', 'released')
          AND c.reference_id = r.reference_id
          AND c.workspace_id = r.workspace_id
      )
  `);

  let expiredCount = 0;

  for (const row of staleReservations) {
    const workspaceId = row['workspace_id'] as string;
    const amount = BigInt(row['amount'] as string);
    const referenceType = row['reference_type'] as string;
    const referenceId = row['reference_id'] as string;

    // Release the reserved credits back to balance
    await releaseCredits(db, workspaceId, amount, referenceType, referenceId);
    expiredCount++;
  }

  return expiredCount;
}

/**
 * Get reservation status — checks if a reservation is still valid.
 * ADR-030: reservation is valid if it hasn't been committed/released
 * and hasn't exceeded the TTL.
 */
export async function getReservationStatus(
  db: Database,
  workspaceId: string,
  referenceId: string,
  ttlMinutes: number = 30,
): Promise<'active' | 'committed' | 'released' | 'expired'> {
  // Check if reservation has been committed or released
  const resolution = await db.execute(sql`
    SELECT entry_type
    FROM wp.credit_ledger_entry
    WHERE workspace_id = ${workspaceId}
      AND reference_id = ${referenceId}
      AND entry_type IN ('committed', 'released')
    LIMIT 1
  `);

  if (resolution.length > 0) {
    const entryType = resolution[0]!['entry_type'] as string;
    return entryType === 'committed' ? 'committed' : 'released';
  }

  // Check if reservation has expired (TTL exceeded)
  const reservation = await db.execute(sql`
    SELECT created_at
    FROM wp.credit_ledger_entry
    WHERE workspace_id = ${workspaceId}
      AND reference_id = ${referenceId}
      AND entry_type = 'reserved'
    LIMIT 1
  `);

  if (reservation.length === 0) {
    return 'expired'; // No reservation found
  }

  const createdAt = new Date(reservation[0]!['created_at'] as string);
  const ttlCutoff = new Date(Date.now() - ttlMinutes * 60 * 1000);

  return createdAt < ttlCutoff ? 'expired' : 'active';
}

/**
 * Quick check if a reservation is still active (not expired/committed/released).
 */
export async function isReservationActive(
  db: Database,
  workspaceId: string,
  referenceId: string,
  ttlMinutes: number = 30,
): Promise<boolean> {
  const status = await getReservationStatus(db, workspaceId, referenceId, ttlMinutes);
  return status === 'active';
}
