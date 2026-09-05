/**
 * M2 Creator Store — API Routes.
 * Exposes creator CRUD via Hono routes.
 * M2 is the ONLY module authorized to read/write GCP tables directly (Doc 14).
 */
import { Hono } from 'hono';
import { z } from 'zod';
import type { TenancyContext } from '@mushin/shared';
import type { Database } from '@mushin/database';
import type { MeilisearchAdapter } from '@mushin/adapters';
import * as creatorRepo from '@mushin/database/repositories/creator.repository';
import type { CreatorWithRelations } from '@mushin/database/repositories/creator.repository';
import { projectCreatorToIndex } from '@mushin/database/projections/creator-index-projection';

// ── Validation Schemas ───────────────────────────────────────

const createCreatorSchema = z.object({
  name: z.string().min(1).max(200),
  handle: z.string().min(1).max(100),
  platform: z.enum(['instagram', 'tiktok', 'youtube', 'twitter', 'facebook']),
  canonicalUrl: z.string().url(),
  bio: z.string().max(5000).optional(),
  followerCount: z.number().int().min(0).optional(),
  followingCount: z.number().int().min(0).optional(),
  postCount: z.number().int().min(0).optional(),
  location: z.string().max(200).optional(),
  languages: z.array(z.string()).optional(),
  profileImageUrl: z.string().url().optional(),
  completenessTier: z.enum(['rich', 'standard', 'sparse', 'minimal']).default('minimal'),
});

const listFiltersSchema = z.object({
  platform: z.enum(['instagram', 'tiktok', 'youtube', 'twitter', 'facebook']).optional(),
  follower_min: z.coerce.number().int().min(0).optional(),
  follower_max: z.coerce.number().int().min(0).optional(),
  engagement_rate_min: z.coerce.number().min(0).max(1).optional(),
  engagement_rate_max: z.coerce.number().min(0).max(1).optional(),
  niche: z.string().optional(),
  authenticity_band: z.enum(['strong', 'moderate', 'weak']).optional(),
  completeness_tier: z.enum(['rich', 'standard', 'sparse', 'minimal']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Route Factory ────────────────────────────────────────────

export function createM2Routes(db: Database, meilisearch: MeilisearchAdapter) {
  const routes = new Hono();

  /**
   * GET /api/v1/creators/:id
   * Single creator detail (FS-01.01, SCR-02).
   * Returns full creator with profiles, enrichment snapshots, niche classifications.
   */
  routes.get('/creators/:id', async (c) => {
    const tenancy = c.get('tenancy') as TenancyContext;
    const requestId = c.get('requestId');
    const creatorId = c.req.param('id');

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(creatorId)) {
      return c.json(
        {
          error: {
            code: 'INVALID_UUID',
            message: 'Creator ID must be a valid UUID',
            request_id: requestId,
          },
        },
        400,
      );
    }

    const result = await creatorRepo.findById(db, creatorId);
    if (!result) {
      return c.json(
        {
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: `Creator not found: ${creatorId}`,
            request_id: requestId,
          },
        },
        404,
      );
    }

    return c.json({
      data: {
        creator: result.creator,
        profiles: result.profiles,
        enrichment: result.enrichmentSnapshots,
        niches: result.nicheClassifications,
      },
      meta: { request_id: requestId },
    });
  });

  /**
   * GET /api/v1/creators
   * List creators (direct DB, not Meilisearch).
   * For admin views, detail pages, and internal tools.
   * The search endpoint (/api/v1/creators/search) is M3's responsibility.
   */
  routes.get('/creators', async (c) => {
    const tenancy = c.get('tenancy') as TenancyContext;
    const requestId = c.get('requestId');

    const rawParams = Object.fromEntries(new URL(c.req.url).searchParams);
    const parsed = listFiltersSchema.safeParse(rawParams);
    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid filter parameters',
            details: parsed.error.flatten(),
            request_id: requestId,
          },
        },
        400,
      );
    }

    const { page, limit, ...filters } = parsed.data;
    const result = await creatorRepo.list(db, filters, page, limit);

    return c.json({
      data: result.data.map((r: CreatorWithRelations) => ({
        creator: r.creator,
        profiles: r.profiles,
        enrichment: r.enrichmentSnapshots,
        niches: r.nicheClassifications,
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
      meta: { request_id: requestId },
    });
  });

  /**
   * POST /api/v1/creators
   * Create a creator (used by M5 after ingestion, and by UF-06 add-by-URL).
   * After successful create, synchronously projects to Meilisearch (ADR-027).
   */
  routes.post('/creators', async (c) => {
    const tenancy = c.get('tenancy') as TenancyContext;
    const requestId = c.get('requestId');

    const body = await c.req.json();
    const parsed = createCreatorSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: parsed.error.flatten(),
            request_id: requestId,
          },
        },
        400,
      );
    }

    const input = parsed.data;

    // Check for duplicate by handle + platform
    const existing = await creatorRepo.findByHandle(db, input.handle, input.platform);
    if (existing) {
      return c.json(
        {
          error: {
            code: 'CONFLICT',
            message: `Creator with handle "${input.handle}" on ${input.platform} already exists`,
            details: { existingCreatorId: existing.creator.creatorId },
            request_id: requestId,
          },
        },
        409,
      );
    }

    // Create creator + profile
    const created = await creatorRepo.create(db, input);

    // ADR-027: Synchronous projection to Meilisearch (NOT in the Postgres transaction)
    // If Meilisearch is down, creator still gets created in GCP. Projection is deferred.
    const meilisearchWrapper = {
      upsertDocument: async (_index: string, doc: Record<string, unknown>) => {
        const result = await meilisearch.upsertDocument(doc as unknown as Parameters<typeof meilisearch.upsertDocument>[0]);
        return { success: result.status === 'success', degraded: result.status === 'projection_deferred' };
      },
    };
    const projectionResult = await projectCreatorToIndex(
      created.creator.creatorId,
      db,
      meilisearchWrapper,
    );

    return c.json(
      {
        data: {
          creator: created.creator,
          profiles: created.profiles,
          enrichment: created.enrichmentSnapshots,
          niches: created.nicheClassifications,
        },
        projection: projectionResult.success
          ? { status: 'indexed' }
          : { status: 'deferred', reason: projectionResult.reason },
        meta: { request_id: requestId },
      },
      201,
    );
  });

  return routes;
}
