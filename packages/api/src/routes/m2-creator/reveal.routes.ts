/**
 * Contact Reveal Routes — ADR-029 compliant.
 *
 * POST /creators/:id/reveal-contact — Reveal creator contact information
 *
 * Flow:
 * 1. Check minor_signal — if true, return 403
 * 2. Check existing reveal record — if exists, return contact (no charge)
 * 3. Check credit balance — if insufficient, return upgrade response
 * 4. Reserve credits (5 credits) via credit repository
 * 5. Fetch contact records from gcp.contact_record
 * 6. Create reveal record in wp.reveal
 * 7. Commit credit reservation
 * 8. Return contact data
 *
 * SAFETY RULE: minor_signal = true → reveal blocked. No exceptions.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import type { Database } from '@mushin/database';
import { creator, contactRecord, reveal } from '@mushin/database';
import * as creditRepository from '@mushin/database/repositories/credit.repository';
import type { TransactionClient } from '@mushin/database/repositories/credit.repository';
import { rateLimitMiddleware } from '../../middleware/rate-limit.js';

// ── Constants ────────────────────────────────────────────────

const REVEAL_CREDIT_COST = 5n;

// ── Route-Specific Rate Limiter (S0-T8) ──────────────────────
// Tighter than global limit: 10 reveals per minute per workspace.
// Compensating control for TD-01 — narrows the exploit window.

const revealRateLimit = rateLimitMiddleware({
  maxRequests: 10,
  windowMs: 60_000,
  keyPrefix: 'rl:reveal',
});

// ── Route Factory ────────────────────────────────────────────

export function createRevealRoutes(db: Database): Hono {
  const routes = new Hono();

  /**
   * POST /creators/:id/reveal-contact
   * Reveal creator contact information.
   *
   * SAFETY: minor_signal = true → BLOCKED. No exceptions.
   */
  routes.post('/:id/reveal-contact', revealRateLimit, async (c) => {
    const requestId = c.get('requestId');
    const tenancy = c.get('tenancy');
    const creatorId = c.req.param('id') as string;

    if (!tenancy) {
      return c.json(
        { error: { code: 'AUTH_REQUIRED', message: 'Authentication required', request_id: requestId } },
        401,
      );
    }

    const workspaceId = tenancy.workspaceId;

    // 1. Fetch creator to check minor_signal
    const [creatorRow] = await db
      .select({ minorSignal: creator.minorSignal })
      .from(creator)
      .where(eq(creator.creatorId, creatorId))
      .limit(1);

    if (!creatorRow) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: `Creator not found: ${creatorId}`, request_id: requestId } },
        404,
      );
    }

    // SAFETY: minor_signal check (ADR-029, AGENTS.md Section 2)
    if (creatorRow.minorSignal) {
      return c.json(
        {
          error: {
            code: 'MINOR_SIGNAL_BLOCKED',
            message: 'Contact reveal is blocked for creators with minor_signal flag per ADR-029.',
            request_id: requestId,
          },
        },
        403,
      );
    }

    // 2. Check if already revealed for this workspace
    const [existingReveal] = await db
      .select()
      .from(reveal)
      .where(
        and(
          eq(reveal.workspaceId, workspaceId),
          eq(reveal.creatorId, creatorId),
        ),
      )
      .limit(1);

    if (existingReveal) {
      // Already revealed — return contact without charge
      const contacts = await db
        .select()
        .from(contactRecord)
        .where(
          and(
            eq(contactRecord.creatorId, creatorId),
            sql`${contactRecord.piiErasedAt} IS NULL`,
          ),
        );

      return c.json({
        data: {
          revealed: true,
          freeReveal: true,
          contact: contacts.reduce((acc, row) => {
            acc[row.contactType] = row.value;
            return acc;
          }, {} as Record<string, string | null>),
        },
        meta: { request_id: requestId },
      });
    }

    // 3. Check credit balance using repository with row-level lock (ADR-026)
    const { balance: currentBalance } = await creditRepository.getBalance(db, workspaceId);

    if (currentBalance < REVEAL_CREDIT_COST) {
      const shortfall = REVEAL_CREDIT_COST - currentBalance;
      return c.json(
        {
          error: {
            code: 'INSUFFICIENT_CREDITS',
            message: `Insufficient credits for contact reveal. Required: ${REVEAL_CREDIT_COST}, Available: ${currentBalance}`,
            details: {
              required: Number(REVEAL_CREDIT_COST),
              available: Number(currentBalance),
              shortfall: Number(shortfall),
            },
            request_id: requestId,
          },
        },
        402,
      );
    }

    // 4. Reserve credits, insert reveal record, and commit — all in one transaction (TD-01 fix)
    const referenceId = crypto.randomUUID();
    let revealed = false;

    try {
      await db.transaction(async (tx) => {
        const txn = tx as unknown as TransactionClient;
        // Reserve credits via repository with SELECT FOR UPDATE (ADR-026)
        const reserveResult = await creditRepository.reserveCredits(
          txn,
          workspaceId,
          REVEAL_CREDIT_COST,
          'reveal_contact',
          referenceId,
        );

        if (!reserveResult.success) {
          throw new Error('INSUFFICIENT_CREDITS');
        }

        // Create reveal record
        await tx.insert(reveal).values({
          workspaceId,
          creatorId,
          creditCost: REVEAL_CREDIT_COST,
          revealedBy: tenancy.userId,
        });

        // Commit credit reservation
        await creditRepository.commitCredits(
          txn,
          workspaceId,
          REVEAL_CREDIT_COST,
          'reveal_contact',
          referenceId,
        );

        revealed = true;
      });
    } catch (err) {
      if (err instanceof Error && err.message === 'INSUFFICIENT_CREDITS') {
        return c.json(
          {
            error: {
              code: 'INSUFFICIENT_CREDITS',
              message: 'Failed to reserve credits for contact reveal — credits may have been consumed by another request',
              request_id: requestId,
            },
          },
          402,
        );
      }
      throw err;
    }

    if (!revealed) {
      return c.json(
        {
          error: {
            code: 'REVEAL_FAILED',
            message: 'Contact reveal failed unexpectedly',
            request_id: requestId,
          },
        },
        500,
      );
    }

    // 5. Fetch contact records
    const contacts = await db
      .select()
      .from(contactRecord)
      .where(
        and(
          eq(contactRecord.creatorId, creatorId),
          sql`${contactRecord.piiErasedAt} IS NULL`,
        ),
      );

    // 8. Emit event (optional, non-fatal)
    try {
      // emitEvent would go here
    } catch {
      // Event emission failure is non-fatal
    }

    return c.json({
      data: {
        revealed: true,
        freeReveal: false,
        creditsUsed: Number(REVEAL_CREDIT_COST),
        contact: contacts.reduce((acc, row) => {
          acc[row.contactType] = row.value;
          return acc;
        }, {} as Record<string, string | null>),
      },
      meta: { request_id: requestId },
    });
  });

  return routes;
}
