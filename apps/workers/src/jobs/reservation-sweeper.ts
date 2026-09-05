/**
 * Reservation Sweeper Worker
 *
 * Scheduled worker that expires stale credit reservations.
 * Per ADR-030: TTL sweeper is the ONLY release mechanism.
 * Runs every 30 minutes to clean up reservations older than TTL.
 *
 * Uses credit.repository.releaseCredits() for safe balance updates
 * with SELECT FOR UPDATE (ADR-026). TD-01 fix: no raw SQL for balance mutations.
 */
import type { Database } from '@mushin/database';
import { sql } from 'drizzle-orm';
import * as creditRepository from '@mushin/database/repositories/credit.repository';

// ── Configuration ────────────────────────────────────────────

const DEFAULT_TTL_MINUTES = 30;

// ── Worker ───────────────────────────────────────────────────

export async function runReservationSweeper(
  db: Database,
  ttlMinutes: number = DEFAULT_TTL_MINUTES,
): Promise<{
  expired: number;
  errors: number;
}> {
  let expired = 0;
  let errors = 0;

  const cutoff = new Date(Date.now() - ttlMinutes * 60 * 1000);

  try {
    // Find stale reservations: 'reserved' entries older than TTL
    // without a matching 'committed' or 'released' entry
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

    for (const row of staleReservations) {
      const workspaceId = row['workspace_id'] as string;
      const amount = BigInt(row['amount'] as string);
      const referenceType = row['reference_type'] as string;
      const referenceId = row['reference_id'] as string;

      try {
        // Use credit.repository.releaseCredits() for safe balance update
        // with SELECT FOR UPDATE (ADR-026) — no raw SQL for balance mutations
        await creditRepository.releaseCredits(
          db,
          workspaceId,
          amount,
          referenceType,
          referenceId,
        );

        expired++;
      } catch (err) {
        errors++;
        console.error(JSON.stringify({
          ts: new Date().toISOString(),
          level: 'error',
          service: 'reservation-sweeper',
          message: `Failed to expire reservation ${referenceId} for workspace ${workspaceId}`,
          error: err instanceof Error ? err.message : 'Unknown error',
        }));
      }
    }
  } catch (err) {
    errors++;
    console.error(JSON.stringify({
      ts: new Date().toISOString(),
      level: 'error',
      service: 'reservation-sweeper',
      message: 'Failed to query stale reservations',
      error: err instanceof Error ? err.message : 'Unknown error',
    }));
  }

  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    level: 'info',
    service: 'reservation-sweeper',
    message: `Sweeper completed: ${expired} expired, ${errors} errors`,
    ttlMinutes,
  }));

  return { expired, errors };
}
