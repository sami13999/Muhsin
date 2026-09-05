/**
 * M3 Search — Natural Language Search (FS-02.02, NFR-P02).
 * Brain 1 with LLM translation: NL query → T-A → structured filters → Meilisearch.
 * Interpretation cache: normalized-query → interpretation, 24h TTL.
 *
 * Extended with demographic filters (Problem 3).
 */
import { Hono } from 'hono';
import { z } from 'zod';
import type { TenancyContext } from '@mushin/shared';
import type { MeilisearchAdapter, LLMAdapter } from '@mushin/adapters';
import { rankHits, DEFAULT_RANKING_WEIGHTS, type RankingContext } from './ranking.js';

// ── Feature Flags ────────────────────────────────────────────

const DEMOGRAPHIC_FILTERS_ENABLED = process.env['DEMOGRAPHIC_FILTERS_ENABLED'] !== 'false';

// ── NL Query Schema ──────────────────────────────────────────

const nlSearchSchema = z.object({
  query: z.string().min(1).max(500),
});

// ── Filter Output Schema (what the LLM must return) ──────────

const baseLlmFilters = z.object({
  platform: z.string().optional(),
  follower_min: z.number().optional(),
  follower_max: z.number().optional(),
  engagement_rate_min: z.number().optional(),
  engagement_rate_max: z.number().optional(),
  geo: z.string().optional(),
  language: z.string().optional(),
  niche: z.string().optional(),
  authenticity_band: z.string().optional(),
  audience_pk_share_min: z.number().optional(),
  audience_gcc_share_min: z.number().optional(),
});

const demographicLlmFilters = DEMOGRAPHIC_FILTERS_ENABLED
  ? z.object({
      audience_female_percent_min: z.number().optional(),
      audience_male_percent_min: z.number().optional(),
      audience_age_band: z.enum(['18-24', '25-34', '35-44', '45+']).optional(),
      audience_age_band_min: z.number().optional(),
      audience_city: z.string().optional(),
      audience_country: z.string().optional(),
    })
  : z.object({});

const llmFilterOutputSchema = z.object({
  filters: baseLlmFilters.merge(demographicLlmFilters),
  chips: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
      field: z.string(),
    }),
  ),
  confidence: z.number().min(0).max(1),
});

type LLMFilterOutput = z.infer<typeof llmFilterOutputSchema>;

// ── Interpretation Cache (24h TTL, shared across users) ──────

interface CachedInterpretation {
  filters: Record<string, unknown>;
  chips: Array<{ label: string; value: string; field: string }>;
  confidence: number;
  cachedAt: number;
}

const interpretationCache = new Map<string, CachedInterpretation>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function normalizeQuery(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, ' ');
}

function getCachedInterpretation(normalizedQuery: string): CachedInterpretation | null {
  const cached = interpretationCache.get(normalizedQuery);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > CACHE_TTL_MS) {
    interpretationCache.delete(normalizedQuery);
    return null;
  }
  return cached;
}

// ── Meilisearch Filter Builder ───────────────────────────────

const DEMOGRAPHIC_CONFIDENCE_THRESHOLD = 0.1;

/** Sanitize a string value for safe interpolation into Meilisearch filter expressions */
function sanitizeFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildMeilisearchFilter(filters: Record<string, unknown>): string[] {
  const parts: string[] = [];
  if (filters['platform']) parts.push(`platform = "${sanitizeFilterValue(filters['platform'] as string)}"`);
  if (filters['follower_min'] !== undefined) parts.push(`followerCount >= ${filters['follower_min']}`);
  if (filters['follower_max'] !== undefined) parts.push(`followerCount <= ${filters['follower_max']}`);
  if (filters['engagement_rate_min'] !== undefined)
    parts.push(`engagementRate >= ${filters['engagement_rate_min']}`);
  if (filters['engagement_rate_max'] !== undefined)
    parts.push(`engagementRate <= ${filters['engagement_rate_max']}`);
  if (filters['niche']) parts.push(`primaryNiche = "${sanitizeFilterValue(filters['niche'] as string)}"`);
  if (filters['authenticity_band'])
    parts.push(`authenticityBand = "${sanitizeFilterValue(filters['authenticity_band'] as string)}"`);
  if (filters['audience_pk_share_min'] !== undefined)
    parts.push(`audiencePkShare >= ${filters['audience_pk_share_min']}`);
  if (filters['audience_gcc_share_min'] !== undefined)
    parts.push(`audienceGccShare >= ${filters['audience_gcc_share_min']}`);

  // Demographic filters
  if (DEMOGRAPHIC_FILTERS_ENABLED) {
    if (filters['audience_female_percent_min'] !== undefined)
      parts.push(`audienceFemalePercent >= ${filters['audience_female_percent_min']}`);
    if (filters['audience_male_percent_min'] !== undefined)
      parts.push(`audienceMalePercent >= ${filters['audience_male_percent_min']}`);
    if (filters['audience_age_band'] && filters['audience_age_band_min'] !== undefined)
      parts.push(`audienceAgeBands.${filters['audience_age_band']} >= ${filters['audience_age_band_min']}`);
    if (filters['audience_city'])
      parts.push(`audienceCities.${sanitizeFilterValue(filters['audience_city'] as string)} >= ${DEMOGRAPHIC_CONFIDENCE_THRESHOLD}`);
    if (filters['audience_country'])
      parts.push(`audienceCountries.${sanitizeFilterValue(filters['audience_country'] as string)} >= ${DEMOGRAPHIC_CONFIDENCE_THRESHOLD}`);
  }

  return parts;
}

// ── Route Factory ────────────────────────────────────────────

export function createNLSearchRoutes(
  meilisearch: MeilisearchAdapter,
  llm: LLMAdapter,
) {
  const routes = new Hono();

  /**
   * POST /api/v1/creators/search/nl
   * NL search (FS-02.02, NFR-P02): ≤1 cheap-model call, cached.
   * On validation failure: one retry → fallback to keyword mode with honest chip.
   */
  routes.post('/search/nl', async (c) => {
    const tenancy = c.get('tenancy') as TenancyContext;
    const requestId = c.get('requestId');

    const body = await c.req.json();
    const parsed = nlSearchSchema.safeParse(body);
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

    const { query } = parsed.data;
    const normalized = normalizeQuery(query);

    // Build ranking context with workspace geo
    const rankingCtx: RankingContext = {
      weights: DEFAULT_RANKING_WEIGHTS,
    };

    // Check interpretation cache (zero-token path)
    const cached = getCachedInterpretation(normalized);
    if (cached) {
      const filterParts = buildMeilisearchFilter(cached.filters);
      const result = await meilisearch.search(
        '',
        filterParts.length > 0 ? filterParts.join(' AND ') : undefined,
        20,
        0,
      );
      const hits = result.status === 'success' ? result.hits : [];
      return c.json({
        interpretation: {
          chips: cached.chips,
          raw: query,
          confidence: cached.confidence,
          cached: true,
        },
        results: rankHits(hits, cached.filters, rankingCtx),
        total: hits.length,
        meta: { request_id: requestId },
      });
    }

    // Translate NL → filters via T-A LLM
    const demographicPrompt = DEMOGRAPHIC_FILTERS_ENABLED ? `
- audience_female_percent_min: float 0-100 (minimum % female audience)
- audience_male_percent_min: float 0-100 (minimum % male audience)
- audience_age_band: "18-24" | "25-34" | "35-44" | "45+"
- audience_age_band_min: float 0-1 (minimum % in age band)
- audience_city: city name (e.g. "Karachi", "Lahore", "Dubai")
- audience_country: country name (e.g. "Pakistan", "UAE", "UK")` : '';

    const systemPrompt = `You are a search query translator for an influencer marketing platform.
Convert natural language queries into structured search filters.

Available filters:
- platform: "instagram" | "tiktok" | "youtube" | "twitter" | "facebook"
- follower_min, follower_max: integer
- engagement_rate_min, engagement_rate_max: float 0-1
- geo: country code (e.g. "PK", "AE", "SA")
- language: language code (e.g. "ur", "en", "ar")
- niche: niche slug (e.g. "pk_fashion_textile", "beauty_skincare", "tech_gadgets")
- authenticity_band: "strong" | "moderate" | "weak"
- audience_pk_share_min, audience_gcc_share_min: float 0-1
${demographicPrompt}

Return JSON matching this schema:
{ "filters": {...}, "chips": [{ "label": "...", "value": "...", "field": "..." }], "confidence": 0.0-1.0 }
Only include filters that are explicitly stated or strongly implied.`;

    const llmResult = await llm.call(
      'T-A',
      systemPrompt,
      query,
      llmFilterOutputSchema,
      { temperature: 0, maxTokens: 500, promptRegistryId: 'nl_query_translator:v2' },
    );

    let translation: LLMFilterOutput;
    if (!llmResult.success) {
      // Fallback: keyword mode with honest chip
      const result = await meilisearch.search(query, undefined, 20, 0);
      const hits = result.status === 'success' ? result.hits : [];
      return c.json({
        interpretation: {
          chips: [{ label: 'Searched as keywords', value: query, field: 'keyword' }],
          raw: query,
          confidence: 0,
          cached: false,
          fallback: true,
        },
        results: rankHits(hits, {}, rankingCtx),
        total: hits.length,
        meta: { request_id: requestId },
      });
    } else {
      translation = llmResult.data;
    }

    // Cache the interpretation
    interpretationCache.set(normalized, {
      filters: translation.filters,
      chips: translation.chips,
      confidence: translation.confidence,
      cachedAt: Date.now(),
    });

    // Search with translated filters
    const filterParts = buildMeilisearchFilter(translation.filters);
    const result = await meilisearch.search(
      '',
      filterParts.length > 0 ? filterParts.join(' AND ') : undefined,
      20,
      0,
    );
    const hits = result.status === 'success' ? result.hits : [];

    return c.json({
      interpretation: {
        chips: translation.chips,
        raw: query,
        confidence: translation.confidence,
        cached: false,
      },
      results: rankHits(hits, translation.filters, rankingCtx),
      total: hits.length,
      meta: { request_id: requestId },
    });
  });

  return routes;
}
