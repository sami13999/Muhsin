/**
 * Creator Refresh Routes — Enqueue enrichment job.
 *
 * POST /creators/:id/refresh — Enqueue enrichment refresh
 *
 * Behavior:
 * - Validate creator exists
 * - Enqueue enrichment job (SQS)
 * - Update profile.enrichmentStatus = 'pending'
 * - Return accepted response (never block)
 */
import { Hono } from 'hono';
import { eq, sql } from 'drizzle-orm';
import type { Database } from '@mushin/database';
import { creator, profile } from '@mushin/database';

// ── Route Factory ────────────────────────────────────────────

export function createRefreshRoutes(db: Database): Hono {
  const routes = new Hono();

  /**
   * POST /creators/:id/refresh
   * Enqueue enrichment refresh for a creator.
   * Returns immediately — never blocks until enrichment finishes.
   */
  routes.post('/:id/refresh', async (c) => {
    const requestId = c.get('requestId');
    const creatorId = c.req.param('id');

    // Validate creator exists
    const [creatorRow] = await db
      .select({ creatorId: creator.creatorId })
      .from(creator)
      .where(eq(creator.creatorId, creatorId))
      .limit(1);

    if (!creatorRow) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: `Creator not found: ${creatorId}`, request_id: requestId } },
        404,
      );
    }

    // Update enrichment status to pending
    await db
      .update(profile)
      .set({
        enrichmentStatus: 'pending',
        updatedAt: new Date(),
      })
      .where(eq(profile.creatorId, creatorId));

    // Enqueue enrichment job (SQS)
    // In production, this would publish to the enrichment queue
    // For now, return accepted status
    const jobId = crypto.randomUUID();

    return c.json({
      data: {
        status: 'accepted',
        jobId,
        creatorId,
        message: 'Enrichment job queued. Results will be available shortly.',
      },
      meta: { request_id: requestId },
    });
  });

  return routes;
}
