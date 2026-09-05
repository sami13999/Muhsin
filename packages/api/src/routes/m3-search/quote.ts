/**
 * M3 Search — Credit Quote for Brain 2 (Doc 8 A5, Doc 10 FS-08.03).
 * Returns credit cost estimate for a Live Discovery job.
 * Does NOT reserve credits (that happens on confirm).
 */
import { Hono } from 'hono';
import { z } from 'zod';

// ── Quote Schema ─────────────────────────────────────────────

const quoteRequestSchema = z.object({
  query: z.string().min(1).max(500),
  filters: z.record(z.unknown()).optional(),
  candidate_count: z.number().int().min(1).max(100).default(20),
});

// ── Pricing (placeholder — actual pricing awaits Doc 17 spike) ──
// Per-candidate cost breakdown:
//   Serper: ~$0.005/query
//   Apify: ~$0.01/profile scrape
//   LLM (T-A/T-B): ~$0.005/scoring
//   YouTube API: ~$0.001/request
//   Meilisearch: ~$0.0001/index write
//   Total per candidate: ~$0.02
//   Overhead (fixed per job): ~$0.05

const COST_PER_CANDIDATE = 0.02; // USD
const FIXED_JOB_OVERHEAD = 0.05; // USD
const CREDITS_PER_USD = 100; // 100 credits = $1

function estimateCredits(candidateCount: number): {
  estimatedCredits: number;
  estimatedCostUsd: number;
  breakdown: Record<string, number>;
} {
  const serperCost = 0.005;
  const apifyCost = 0.01 * candidateCount;
  const llmCost = 0.005 * candidateCount;
  const youtubeCost = 0.001 * candidateCount;
  const indexCost = 0.0001 * candidateCount;

  const totalUsd = FIXED_JOB_OVERHEAD + serperCost + apifyCost + llmCost + youtubeCost + indexCost;
  const credits = Math.ceil(totalUsd * CREDITS_PER_USD);

  return {
    estimatedCredits: credits,
    estimatedCostUsd: Math.round(totalUsd * 100) / 100,
    breakdown: {
      serper: serperCost,
      apify: apifyCost,
      llm: llmCost,
      youtube_api: youtubeCost,
      meilisearch: indexCost,
      overhead: FIXED_JOB_OVERHEAD,
    },
  };
}

// ── Route Factory ────────────────────────────────────────────

export function createQuoteRoutes() {
  const routes = new Hono();

  /**
   * POST /api/v1/search/quote
   * Credit quote for Brain 2 Live Discovery.
   * Returns estimate without reserving credits.
   */
  routes.post('/quote', async (c) => {
    const requestId = c.get('requestId');

    const body = await c.req.json();
    const parsed = quoteRequestSchema.safeParse(body);
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

    const { query, filters, candidate_count } = parsed.data;
    const estimate = estimateCredits(candidate_count);

    return c.json({
      data: {
        query,
        filters: filters ?? {},
        candidate_count,
        estimate: {
          credits: estimate.estimatedCredits,
          cost_usd: estimate.estimatedCostUsd,
          breakdown: estimate.breakdown,
          currency: 'credits',
        },
        disclaimer: 'Estimate only. Actual cost depends on provider rates and candidate success rate.',
      },
      meta: { request_id: requestId },
    });
  });

  return routes;
}
