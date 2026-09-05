/**
 * Credit Grant Worker
 *
 * Scheduled worker that grants monthly credit allowances based on subscription plan.
 * Runs once per month to credit all active workspaces.
 *
 * Uses credit.repository.grantCredits() for safe balance updates
 * with SELECT FOR UPDATE (ADR-026). TD-01 fix: no raw SQL for balance mutations.
 */
import type { Database } from '@mushin/database';
import { sql } from 'drizzle-orm';
import * as creditRepository from '@mushin/database/repositories/credit.repository';

// ── Plan Credit Allowances ───────────────────────────────────

const PLAN_ALLOWANCES: Record<string, number> = {
  free: 100,
  starter: 500,
  growth: 2000,
  agency: 10000,
  enterprise: 50000,
};

// ── Worker ───────────────────────────────────────────────────

export async function runCreditGrantJob(db: Database): Promise<{
  granted: number;
  skipped: number;
  errors: number;
}> {
  let granted = 0;
  let skipped = 0;
  let errors = 0;

  // Get all active workspaces with subscriptions
  const workspaces = await db.execute(sql`
    SELECT workspace_id, subscription_plan_id, subscription_state
    FROM wp.workspace
    WHERE subscription_state IN ('active', 'trialing')
      AND subscription_plan_id IS NOT NULL
  `);

  const period = getCurrentPeriod();

  for (const ws of workspaces) {
    const workspaceId = ws['workspace_id'] as string;
    const plan = ws['subscription_plan_id'] as string;
    const allowance = PLAN_ALLOWANCES[plan] ?? PLAN_ALLOWANCES['free']!;

    try {
      // Check if grant already exists for this period
      const existingGrant = await db.execute(sql`
        SELECT entry_id FROM wp.credit_ledger_entry
        WHERE workspace_id = ${workspaceId}
          AND entry_type = 'allowance_grant'
          AND period = ${period}
        LIMIT 1
      `);

      if (existingGrant.length > 0) {
        skipped++;
        continue;
      }

      // Grant credits using repository for safe balance update (ADR-026)
      await creditRepository.grantCredits(
        db,
        workspaceId,
        BigInt(allowance),
        'allowance_grant',
        period,
        `Monthly allowance for ${plan} plan`,
      );

      granted++;
    } catch (err) {
      errors++;
      console.error(JSON.stringify({
        ts: new Date().toISOString(),
        level: 'error',
        service: 'credit-grant',
        message: `Failed to grant credits for workspace ${workspaceId}`,
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
    }
  }

  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    level: 'info',
    service: 'credit-grant',
    message: `Credit grant job completed: ${granted} granted, ${skipped} skipped, ${errors} errors`,
    period,
  }));

  return { granted, skipped, errors };
}

// ── Helpers ──────────────────────────────────────────────────

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
