/**
 * Staff Portal Routes — Support and Admin endpoints.
 *
 * Support (read-only):
 *   GET /staff/workspaces — List all workspaces
 *   GET /staff/workspaces/:id — Workspace detail
 *   GET /staff/customers — Customer search
 *   GET /staff/creators/:id — Creator detail (read)
 *   GET /staff/audit/:workspaceId — Workspace audit logs
 *
 * Admin-only:
 *   POST /staff/credits/adjust — Credit adjustment
 *   POST /staff/impersonate — Start impersonation
 *   POST /staff/impersonate/end — End impersonation
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import type { Database } from '@mushin/database';
import { workspace, membership, creator, profile } from '@mushin/database';
import * as creditRepository from '@mushin/database/repositories/credit.repository';
import type { TransactionClient } from '@mushin/database/repositories/credit.repository';
import { staffOnly } from '../../middleware/tenancy.js';
import { requireStaffRole, requirePermission } from '../../middleware/staff-rbac.js';
import { auditLog } from '../../middleware/audit-log.js';
import { startImpersonation, endImpersonation } from '../../middleware/impersonation.js';
import { eq, desc, count, like, or } from 'drizzle-orm';

// ── Validation Schemas ───────────────────────────────────────

const creditAdjustSchema = z.object({
  workspaceId: z.string().uuid(),
  amount: z.number().int(),
  reason: z.string().min(10),
  ticketRef: z.string().optional(),
});

const impersonateSchema = z.object({
  workspaceId: z.string().uuid(),
  mode: z.enum(['read-only', 'full']).default('read-only'),
  reason: z.string().min(10),
});

// ── Route Factory ────────────────────────────────────────────

export function createStaffPortalRoutes(db: Database): Hono {
  const routes = new Hono();

  // ── Support Routes (read-only) ────────────────────────────

  /**
   * GET /staff/workspaces
   * List all workspaces (support + admin).
   */
  routes.get('/workspaces',
    staffOnly,
    requirePermission('workspace.inspect'),
    async (c) => {
      const requestId = c.get('requestId');
      const limit = Math.min(Number(c.req.query('limit') ?? '50'), 100);
      const offset = Number(c.req.query('offset') ?? '0');

      const workspaces = await db
        .select({
          workspaceId: workspace.workspaceId,
          name: workspace.name,
          slug: workspace.slug,
          subscriptionState: workspace.subscriptionState,
          subscriptionPlanId: workspace.subscriptionPlanId,
          createdAt: workspace.createdAt,
        })
        .from(workspace)
        .orderBy(desc(workspace.createdAt))
        .limit(limit)
        .offset(offset);

      const [totalResult] = await db.select({ total: count() }).from(workspace);

      return c.json({
        data: workspaces,
        total: totalResult?.total ?? 0,
        limit,
        offset,
        meta: { request_id: requestId },
      });
    },
  );

  /**
   * GET /staff/workspaces/:id
   * Workspace detail (support + admin).
   */
  routes.get('/workspaces/:id',
    staffOnly,
    requirePermission('workspace.inspect'),
    async (c) => {
      const requestId = c.get('requestId');
      const workspaceId = c.req.param('id')!;

      const [ws] = await db
        .select()
        .from(workspace)
        .where(eq(workspace.workspaceId, workspaceId))
        .limit(1);

      if (!ws) {
        return c.json(
          { error: { code: 'NOT_FOUND', message: 'Workspace not found', request_id: requestId } },
          404,
        );
      }

      // Get member count
      const [memberCount] = await db
        .select({ total: count() })
        .from(membership)
        .where(eq(membership.workspaceId, workspaceId));

      // Get credit balance
      const [balance] = await db.execute(sql`
        SELECT balance FROM wp.workspace_credit_balance WHERE workspace_id = ${workspaceId}
      `);

      return c.json({
        data: {
          ...ws,
          memberCount: memberCount?.total ?? 0,
          creditBalance: balance?.['balance'] ?? 0,
        },
        meta: { request_id: requestId },
      });
    },
  );

  /**
   * GET /staff/customers
   * Customer search (support + admin).
   */
  routes.get('/customers',
    staffOnly,
    requirePermission('workspace.inspect'),
    async (c) => {
      const requestId = c.get('requestId');
      const query = c.req.query('q') ?? '';
      const limit = Math.min(Number(c.req.query('limit') ?? '50'), 100);

      if (!query || query.length < 2) {
        return c.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Search query must be at least 2 characters', request_id: requestId } },
          400,
        );
      }

      const customers = await db
        .select({
          workspaceId: workspace.workspaceId,
          name: workspace.name,
          slug: workspace.slug,
          subscriptionState: workspace.subscriptionState,
          subscriptionPlanId: workspace.subscriptionPlanId,
        })
        .from(workspace)
        .where(or(
          like(workspace.name, `%${query}%`),
          like(workspace.slug, `%${query}%`),
        ))
        .limit(limit);

      return c.json({
        data: customers,
        meta: { request_id: requestId },
      });
    },
  );

  /**
   * GET /staff/creators/:id
   * Creator detail (read-only, support + admin).
   */
  routes.get('/creators/:id',
    staffOnly,
    requirePermission('creator.read_view'),
    async (c) => {
      const requestId = c.get('requestId');
      const creatorId = c.req.param('id')!

      const [creatorRow] = await db
        .select()
        .from(creator)
        .where(eq(creator.creatorId, creatorId))
        .limit(1);

      if (!creatorRow) {
        return c.json(
          { error: { code: 'NOT_FOUND', message: 'Creator not found', request_id: requestId } },
          404,
        );
      }

      const profiles = await db
        .select()
        .from(profile)
        .where(eq(profile.creatorId, creatorId))
        .orderBy(desc(profile.followerCount));

      return c.json({
        data: { creator: creatorRow, profiles },
        meta: { request_id: requestId },
      });
    },
  );

  /**
   * GET /staff/audit/:workspaceId
   * Workspace audit logs (support + admin).
   */
  routes.get('/audit/:workspaceId',
    staffOnly,
    requirePermission('audit.workspace_scoped'),
    async (c) => {
      const requestId = c.get('requestId');
      const workspaceId = c.req.param('workspaceId')!;
      const limit = Math.min(Number(c.req.query('limit') ?? '50'), 100);
      const offset = Number(c.req.query('offset') ?? '0');

      const auditLogs = await db.execute(sql`
        SELECT * FROM platform.audit_log
        WHERE workspace_id = ${workspaceId}
        ORDER BY occurred_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);

      return c.json({
        data: auditLogs,
        meta: { request_id: requestId },
      });
    },
  );

  // ── Admin-Only Routes ────────────────────────────────────

  /**
   * POST /staff/credits/adjust
   * Credit adjustment (admin only).
   * Uses credit repository for ledger consistency.
   */
  routes.post('/credits/adjust',
    staffOnly,
    requireStaffRole('admin'),
    requirePermission('ledger.correct'),
    auditLog('ledger.correction', 'ledger'),
    async (c) => {
      const requestId = c.get('requestId');
      const tenancy = c.get('tenancy');
      const body = await c.req.json();
      const parsed = creditAdjustSchema.safeParse(body);

      if (!parsed.success) {
        return c.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: parsed.error.flatten(), request_id: requestId } },
          400,
        );
      }

      const { workspaceId, amount, reason, ticketRef } = parsed.data;
      const referenceId = crypto.randomUUID();

      // Positive amount = grant, negative = deduct — both wrapped in transaction (TD-01 fix)
      try {
        await db.transaction(async (tx) => {
          const txn = tx as unknown as TransactionClient;
          if (amount > 0) {
            // Grant credits
            await creditRepository.grantCredits(
              txn,
              workspaceId,
              BigInt(amount),
              'promo_grant',
              undefined,
              `Staff adjustment: ${reason}`,
            );
          } else if (amount < 0) {
            // Deduct credits — reserve then commit in same transaction
            const reserveResult = await creditRepository.reserveCredits(
              txn,
              workspaceId,
              BigInt(Math.abs(amount)),
              'staff_adjustment',
              referenceId,
            );

            if (!reserveResult.success) {
              throw new Error('INSUFFICIENT_CREDITS');
            }

            await creditRepository.commitCredits(
              txn,
              workspaceId,
              BigInt(Math.abs(amount)),
              'staff_adjustment',
              referenceId,
            );
          }
        });
      } catch (err) {
        if (err instanceof Error && err.message === 'INSUFFICIENT_CREDITS') {
          const { balance } = await creditRepository.getBalance(db, workspaceId);
          return c.json(
            {
              error: {
                code: 'INSUFFICIENT_CREDITS',
                message: `Cannot deduct ${Math.abs(amount)} credits. Available: ${balance}`,
                request_id: requestId,
              },
            },
            402,
          );
        }
        throw err;
      }

      // Get updated balance
      const { balance: newBalance } = await creditRepository.getBalance(db, workspaceId);

      return c.json({
        data: {
          status: 'completed',
          workspaceId,
          amount,
          reason,
          ticketRef,
          newBalance: Number(newBalance),
        },
        meta: { request_id: requestId },
      });
    },
  );

  /**
   * POST /staff/impersonate
   * Start impersonation (admin only).
   */
  routes.post('/impersonate',
    staffOnly,
    requireStaffRole('admin'),
    requirePermission('impersonate'),
    auditLog('impersonation.start', 'impersonation'),
    async (c) => {
      const requestId = c.get('requestId');
      const tenancy = c.get('tenancy');
      const body = await c.req.json();
      const parsed = impersonateSchema.safeParse(body);

      if (!parsed.success) {
        return c.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: parsed.error.flatten(), request_id: requestId } },
          400,
        );
      }

      const staffRole = tenancy.claims?.role as 'admin' | 'support';

      // Start impersonation session via service
      const session = startImpersonation(
        tenancy.userId,
        staffRole,
        parsed.data.workspaceId,
        parsed.data.mode,
      );

      return c.json({
        data: {
          sessionId: session.sessionId,
          workspaceId: parsed.data.workspaceId,
          mode: parsed.data.mode,
          expiresAt: session.expiresAt.toISOString(),
        },
        meta: { request_id: requestId },
      });
    },
  );

  /**
   * POST /staff/impersonate/end
   * End impersonation (admin only).
   */
  routes.post('/impersonate/end',
    staffOnly,
    requireStaffRole('admin'),
    auditLog('impersonation.end', 'impersonation'),
    async (c) => {
      const requestId = c.get('requestId');
      const body = await c.req.json();
      const { sessionId } = body ?? {};

      if (!sessionId) {
        return c.json(
          { error: { code: 'VALIDATION_ERROR', message: 'sessionId is required', request_id: requestId } },
          400,
        );
      }

      const ended = endImpersonation(sessionId);

      return c.json({
        data: { success: ended },
        meta: { request_id: requestId },
      });
    },
  );

  return routes;
}
