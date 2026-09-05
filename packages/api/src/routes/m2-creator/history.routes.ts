/**
 * Engagement History Routes — Creator detail page support.
 *
 * GET /creators/:id/engagement-history — Historical enrichment snapshots
 *
 * Returns 90-day history of enrichment snapshots for a creator.
 * Append-only reads — no mutations.
 */
import { Hono } from 'hono';
import { eq, and, sql, desc } from 'drizzle-orm';
import type { Database } from '@mushin/database';
import { enrichmentSnapshot } from '@mushin/database';

// ── Route Factory ────────────────────────────────────────────

export function createHistoryRoutes(db: Database): Hono {
  const routes = new Hono();

  /**
   * GET /creators/:id/engagement-history
   * Historical enrichment snapshots (90-day window).
   */
  routes.get('/:id/engagement-history', async (c) => {
    const requestId = c.get('requestId');
    const creatorId = c.req.param('id');
    const days = Math.min(Number(c.req.query('days') ?? '90'), 365);

    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const snapshots = await db
      .select({
        snapshotId: enrichmentSnapshot.snapshotId,
        snapshotType: enrichmentSnapshot.snapshotType,
        verdict: enrichmentSnapshot.verdict,
        confidenceLevel: enrichmentSnapshot.confidenceLevel,
        createdAt: enrichmentSnapshot.createdAt,
      })
      .from(enrichmentSnapshot)
      .where(
        and(
          eq(enrichmentSnapshot.creatorId, creatorId),
          sql`${enrichmentSnapshot.createdAt} >= ${cutoffDate}`,
        ),
      )
      .orderBy(desc(enrichmentSnapshot.createdAt));

    // Transform snapshots into time-series data
    const history = snapshots.map((snapshot) => {
      const verdict = snapshot.verdict as Record<string, unknown>;
      return {
        date: snapshot.createdAt?.toISOString().split('T')[0] ?? null,
        snapshotType: snapshot.snapshotType,
        authenticityScore: snapshot.snapshotType === 'authenticity' ? verdict['score'] ?? null : null,
        qualityScore: snapshot.snapshotType === 'quality' ? verdict['score'] ?? null : null,
        audienceEstimate: snapshot.snapshotType === 'audience_estimate' ? verdict['estimated_audience'] ?? null : null,
        confidenceLevel: snapshot.confidenceLevel,
        snapshotId: snapshot.snapshotId,
      };
    });

    return c.json({
      data: {
        creatorId,
        days,
        history,
        totalSnapshots: history.length,
      },
      meta: { request_id: requestId },
    });
  });

  return routes;
}
