/**
 * M3 Search — Deterministic Filtered Search (FS-02.01, NFR-P01).
 * Brain 1: Meilisearch query → deterministic ranking → sub-second, zero LLM cost.
 *
 * Extended with:
 * - Demographic filters (gender, age, city, country)
 * - Rising score support
 * - Pakistan-first boost (workspace-aware)
 * - Trending sort option
 */
import { Hono } from 'hono';
import { z } from 'zod';
import type { TenancyContext } from '@mushin/shared';
import type { MeilisearchAdapter } from '@mushin/adapters';
import { rankHits, DEFAULT_RANKING_WEIGHTS, type RankingContext } from './ranking.js';

// ── Feature Flags ────────────────────────────────────────────

const DEMOGRAPHIC_FILTERS_ENABLED = process.env['DEMOGRAPHIC_FILTERS_ENABLED'] !== 'false';
const TRENDING_SORT_ENABLED = process.env['TRENDING_SORT_ENABLED'] !== 'false';

// ── Filter Schema (Doc 15 B3 — all filterable attributes) ────

const baseFiltersSchema = z.object({
  q: z.string().max(500, 'Search query must not exceed 500 characters').optional(),
  query: z.string().max(500, 'Search query must not exceed 500 characters').optional(),
  platform: z.enum(['instagram', 'tiktok', 'youtube', 'twitter', 'facebook']).optional(),
  follower_min: z.coerce.number().int().min(0).optional(),
  follower_max: z.coerce.number().int().min(0).optional(),
  engagement_rate_min: z.coerce.number().min(0).max(1).optional(),
  engagement_rate_max: z.coerce.number().min(0).max(1).optional(),
  geo: z.string().regex(/^[a-zA-Z0-9\s\-_]+$/, 'Invalid geo filter').max(100).optional(),
  language: z.string().regex(/^[a-zA-Z0-9\-_]+$/, 'Invalid language filter').max(50).optional(),
  niche: z.string().regex(/^[a-zA-Z0-9\s\-_]+$/, 'Invalid niche filter').max(100).optional(),
  authenticity_band: z.enum(['strong', 'moderate', 'weak']).optional(),
  audience_pk_share_min: z.coerce.number().min(0).max(1).optional(),
  audience_gcc_share_min: z.coerce.number().min(0).max(1).optional(),
  completeness_tier: z.enum(['rich', 'standard', 'sparse', 'minimal']).optional(),
});

const demographicFiltersSchema = DEMOGRAPHIC_FILTERS_ENABLED
  ? z.object({
      audience_female_percent_min: z.coerce.number().min(0).max(100).optional(),
      audience_male_percent_min: z.coerce.number().min(0).max(100).optional(),
      audience_age_band: z.enum(['18-24', '25-34', '35-44', '45+']).optional(),
      audience_age_band_min: z.coerce.number().min(0).max(1).optional(),
      audience_city: z.string().regex(/^[a-zA-Z0-9\s\-_]+$/, 'Invalid city filter').max(100).optional(),
      audience_country: z.string().regex(/^[a-zA-Z0-9\s\-_]+$/, 'Invalid country filter').max(100).optional(),
    })
  : z.object({});

const sortOptions = ['relevance', 'follower_count', 'engagement_rate', 'quality_score', 'freshness'] as const;
const trendingSortOptions = TRENDING_SORT_ENABLED ? ['trending' as const] : [] as const;
const allSortOptions = [...sortOptions, ...trendingSortOptions] as ['relevance', ...string[]];

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort_by: z.enum(['relevance', 'follower_count', 'engagement_rate', 'quality_score', 'freshness', 'trending']).default('relevance'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

const searchFiltersSchema = baseFiltersSchema.merge(demographicFiltersSchema).merge(paginationSchema);

type SearchFilters = z.infer<typeof searchFiltersSchema>;

// ── Meilisearch Filter Builder ───────────────────────────────

/** Sanitize a string value for safe interpolation into Meilisearch filter expressions */
function sanitizeFilterValue(value: string): string {
  // Escape double quotes and backslashes to prevent filter injection
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

const DEMOGRAPHIC_CONFIDENCE_THRESHOLD = 0.1;

function buildMeilisearchFilter(filters: SearchFilters): string[] {
  const parts: string[] = [];

  // Base filters
  if (filters.platform) parts.push(`platform = "${sanitizeFilterValue(filters.platform)}"`);
  if (filters.follower_min !== undefined) parts.push(`followerCount >= ${filters.follower_min}`);
  if (filters.follower_max !== undefined) parts.push(`followerCount <= ${filters.follower_max}`);
  if (filters.engagement_rate_min !== undefined)
    parts.push(`engagementRate >= ${filters.engagement_rate_min}`);
  if (filters.engagement_rate_max !== undefined)
    parts.push(`engagementRate <= ${filters.engagement_rate_max}`);
  if (filters.niche) parts.push(`primaryNiche = "${sanitizeFilterValue(filters.niche)}"`);
  if (filters.authenticity_band)
    parts.push(`authenticityBand = "${sanitizeFilterValue(filters.authenticity_band)}"`);
  if (filters.completeness_tier)
    parts.push(`completenessTier = "${sanitizeFilterValue(filters.completeness_tier)}"`);
  if (filters.audience_pk_share_min !== undefined)
    parts.push(`audiencePkShare >= ${filters.audience_pk_share_min}`);
  if (filters.audience_gcc_share_min !== undefined)
    parts.push(`audienceGccShare >= ${filters.audience_gcc_share_min}`);

  // Demographic filters
  if (DEMOGRAPHIC_FILTERS_ENABLED) {
    if ('audience_female_percent_min' in filters && filters.audience_female_percent_min !== undefined)
      parts.push(`audienceFemalePercent >= ${filters.audience_female_percent_min}`);
    if ('audience_male_percent_min' in filters && filters.audience_male_percent_min !== undefined)
      parts.push(`audienceMalePercent >= ${filters.audience_male_percent_min}`);
    if ('audience_age_band' in filters && 'audience_age_band_min' in filters &&
        filters.audience_age_band && filters.audience_age_band_min !== undefined)
      parts.push(`audienceAgeBands.${filters.audience_age_band} >= ${filters.audience_age_band_min}`);
    if ('audience_city' in filters && filters.audience_city)
      parts.push(`audienceCities.${sanitizeFilterValue(filters.audience_city as string)} >= ${DEMOGRAPHIC_CONFIDENCE_THRESHOLD}`);
    if ('audience_country' in filters && filters.audience_country)
      parts.push(`audienceCountries.${sanitizeFilterValue(filters.audience_country as string)} >= ${DEMOGRAPHIC_CONFIDENCE_THRESHOLD}`);
  }

  return parts;
}

// ── Route Factory ────────────────────────────────────────────

export function createSearchRoutes(meilisearch: MeilisearchAdapter) {
  const routes = new Hono();

  /**
   * GET /api/v1/creators/search
   * Deterministic filtered search (Brain 1, FS-02.01, NFR-P01).
   * Zero LLM tokens. Identical query + index state = identical results (FS-02.03).
   */
  routes.get('/search', async (c) => {
    const tenancy = (c.get('tenancy') as TenancyContext) ?? {};
    const requestId = c.get('requestId');

    // Parse and validate filters
    const rawParams = Object.fromEntries(new URL(c.req.url).searchParams);
    const parsed = searchFiltersSchema.safeParse(rawParams);
    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid search parameters',
            details: parsed.error.flatten(),
            request_id: requestId,
          },
        },
        400,
      );
    }

    const filters = parsed.data;

    // Canonical keyword resolution (Fix F-01):
    // Prefer `q` as canonical parameter over `query`. Trim whitespace.
    const rawKeyword = filters.q !== undefined ? filters.q : (filters.query ?? '');
    const keyword = rawKeyword.trim();

    const offset = (filters.page - 1) * filters.limit;
    const meiliFilters = buildMeilisearchFilter(filters);
    // When no filters exist, omit filter option entirely (Fix F-03)
    const filterExpression = meiliFilters.length > 0 ? meiliFilters.join(' AND ') : undefined;

    // Query Meilisearch (Brain 1)
    const result = await meilisearch.search(
      keyword,
      filterExpression,
      filters.limit,
      offset,
    );

    if (result.status === 'error') {
      return c.json(
        {
          error: {
            code: 'ADAPTER_DEGRADED',
            message: 'Search index unavailable',
            request_id: requestId,
          },
        },
        503,
      );
    }

    if (result.status === 'degraded') {
      return c.json(
        {
          data: [],
          total: 0,
          page: filters.page,
          limit: filters.limit,
          meta: {
            request_id: requestId,
            degraded: true,
            reason: result.reason,
            total_precision: 'exact',
          },
        },
        200,
      );
    }

    // In-memory guard against tombstoned creators (defense-in-depth).
    // Note: CreatorIndexDocument is a public-data-only projection and does not store piiErasedAt.
    // The authoritative GDPR safeguard is the Step 2B asynchronous deletion flow
    // (CREATOR_ERASED event -> worker -> meilisearch.deleteDocument) and projection guards in M2/M5.
    // Here we ensure any tombstoned document with '[ERASED]' markers is never exposed in results.
    const activeHits = result.hits.filter((hit) => {
      const h = hit as Record<string, unknown>;
      return h['displayName'] !== '[ERASED]' && h['primaryHandle'] !== '[ERASED]';
    });

    // Build ranking context with workspace geo for Pakistan boost
    const rankingCtx: RankingContext = {
      weights: DEFAULT_RANKING_WEIGHTS,
      workspaceGeo: tenancy.workspaceId ? undefined : undefined, // TODO: extract from workspace metadata
    };

    // Apply deterministic ranking (Doc 15 B3)
    const filterParams: Record<string, unknown> = { ...filters };
    const ranked = rankHits(activeHits, filterParams, rankingCtx);

    // Determine accurate matching count and total precision (Step 2C.1):
    // In Meilisearch (v0.44.0), offset pagination (limit + offset) returns `estimatedTotalHits`.
    // When finite pagination (page + hitsPerPage) or exhaustive counts are enabled, `totalHits` is returned.
    // When total counts are unavailable:
    // - On page 1 with fewer hits than limit, the page length is the exact total.
    // - On later pages (or full first pages), `offset + ranked.length` is ONLY a lower bound
    //   and is explicitly tagged as 'lower_bound' in meta so it is never misrepresented as the exact total.
    let totalCount: number;
    let totalPrecision: 'exact' | 'estimated' | 'lower_bound';

    if (typeof result.totalHits === 'number') {
      totalCount = result.totalHits;
      totalPrecision = 'exact';
    } else if (typeof result.estimatedTotalHits === 'number') {
      totalCount = result.estimatedTotalHits;
      totalPrecision = 'estimated';
    } else if (filters.page === 1 && ranked.length < filters.limit) {
      totalCount = ranked.length;
      totalPrecision = 'exact';
    } else {
      totalCount = offset + ranked.length;
      totalPrecision = 'lower_bound';
    }

    return c.json({
      data: ranked,
      total: totalCount,
      page: filters.page,
      limit: filters.limit,
      meta: {
        request_id: requestId,
        total_precision: totalPrecision,
        ...(totalPrecision === 'lower_bound' ? { is_lower_bound: true } : {}),
      },
    });
  });

  return routes;
}
