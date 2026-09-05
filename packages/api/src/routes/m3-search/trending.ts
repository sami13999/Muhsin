/**
 * M3 Search — Trending Creators Endpoint (Problem 2).
 * Returns creators sorted by trending_score (short-term momentum).
 * Trending is NOT search ranking — it's a reusable computed signal.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import type { TenancyContext } from '@mushin/shared';
import type { Database } from '@mushin/database';
import { TrendingService } from '../../services/trending.service.js';

// ── Query Schema ─────────────────────────────────────────────

const trendingQuerySchema = z.object({
  platform: z.enum(['instagram', 'tiktok', 'youtube', 'twitter', 'facebook']).optional(),
  niche: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ── Route Factory ────────────────────────────────────────────

export function createTrendingRoutes(db: Database) {
  const routes = new Hono();

  /**
   * GET /api/v1/creators/trending
   * Returns creators sorted by trending_score.
   * Filterable by platform and niche.
   */
  routes.get('/trending', async (c) => {
    const tenancy = c.get('tenancy') as TenancyContext;
    const requestId = c.get('requestId');

    // Parse query params
    const rawParams = Object.fromEntries(new URL(c.req.url).searchParams);
    const parsed = trendingQuerySchema.safeParse(rawParams);
    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid trending parameters',
            details: parsed.error.flatten(),
            request_id: requestId,
          },
        },
        400,
      );
    }

    const { platform, niche, limit, offset } = parsed.data;

    // Build query to get creators with recent enrichment
    const platformFilter = platform ? sql` AND p.platform = ${platform}` : sql``;
    const nicheFilter = niche ? sql` AND nc.primary_niche = ${niche}` : sql``;
    const fetchLimit = limit + offset;

    const rows = await db.execute(sql`
      SELECT DISTINCT 
        es.creator_id,
        c.display_name,
        c.primary_handle,
        p.platform,
        p.follower_count,
        p.engagement_rate,
        nc.primary_niche
      FROM gcp.enrichment_snapshot es
      JOIN gcp.creator c ON c.creator_id = es.creator_id
      LEFT JOIN gcp.profile p ON p.creator_id = es.creator_id AND p.is_current = TRUE
      LEFT JOIN gcp.niche_classification nc ON nc.creator_id = es.creator_id AND nc.is_current = TRUE
      WHERE es.is_current = TRUE
        AND es.created_at >= NOW() - INTERVAL '60 days'
        AND c.merge_status = 'active'
        AND c.index_pending = FALSE
        ${platformFilter}
        ${nicheFilter}
      ORDER BY p.follower_count DESC
      LIMIT ${fetchLimit} OFFSET ${offset}
    `);

    const trendingService = new TrendingService(db);

    // Compute trending scores
    const creatorIds = rows.map((r) => r['creator_id'] as string);
    const trendingScores = await trendingService.computeTrendingScoresBatch(creatorIds);

    // Merge scores with creator data
    const results = rows
      .map((row) => {
        const trending = trendingScores.get(row['creator_id'] as string);
        if (!trending || trending.score === 0) return null;

        return {
          creatorId: row['creator_id'],
          displayName: row['display_name'],
          primaryHandle: row['primary_handle'],
          platform: row['platform'],
          followerCount: Number(row['follower_count'] ?? 0),
          engagementRate: Number(row['engagement_rate'] ?? 0),
          primaryNiche: row['primary_niche'],
          trendingScore: trending.score,
          trendingExplanation: trending.inputs,
          trendDirection: trending.trendDirection,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b?.trendingScore ?? 0) - (a?.trendingScore ?? 0))
      .slice(0, limit);

    return c.json({
      data: results,
      meta: {
        request_id: requestId,
        computedAt: new Date().toISOString(),
        ttl: 1800, // 30 minutes
      },
    });
  });

  return routes;
}
