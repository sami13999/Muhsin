/**
 * Deterministic Ranking (Doc 15 B3, FS-02.03).
 * Identical query + index state = identical results.
 * All factors are precomputed GCP attributes — zero LLM at query time (ADR-018).
 *
 * Extended with:
 * - rising_score: exploration layer for newly rising creators
 * - pakistanDefaultBoost: workspace-aware PK-first discovery
 */

// ── Feature Flags (environment variables) ────────────────────

const RISING_SCORE_ENABLED = process.env['RISING_SCORE_ENABLED'] !== 'false';
const PAKISTAN_BOOST_ENABLED = process.env['PAKISTAN_BOOST_ENABLED'] !== 'false';
const PAKISTAN_BOOST_WEIGHT = parseFloat(process.env['PAKISTAN_BOOST_WEIGHT'] ?? '0.05');

// ── Ranking Weights (configurable, flag-tunable) ─────────────

export interface RankingWeights {
  relevance: number;
  criteriaMatch: number;
  authenticityWeight: number;
  qualityScore: number;
  freshnessDecay: number;
  longTailFairness: number;
  risingScore: number;
}

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  relevance: 0.22,
  criteriaMatch: 0.18,
  authenticityWeight: 0.18,
  qualityScore: 0.13,
  freshnessDecay: 0.09,
  longTailFairness: 0.10,
  risingScore: 0.10,
};

// ── Pakistan Boost Config ────────────────────────────────────

interface PakistanBoostConfig {
  enabled: boolean;
  baseWeight: number;
  strongNicheMultiplier: number;
  weakNicheMultiplier: number;
}

const DEFAULT_PAKISTAN_BOOST: PakistanBoostConfig = {
  enabled: PAKISTAN_BOOST_ENABLED,
  baseWeight: PAKISTAN_BOOST_WEIGHT,
  strongNicheMultiplier: 1.5,
  weakNicheMultiplier: 0.5,
};

// PK-strong niches (DOC-018 Part H)
const PK_STRONG_NICHES = [
  'pk_fashion_textile',
  'pk_food_street_culture',
  'pk_politics_commentary',
  'pk_drama_entertainment',
  'pk_tech_startups',
  'pk_agriculture_rural',
  'pk_diaspora_content',
];

// ── Follower Bands (T5 long-tail fairness) ───────────────────

type FollowerBand = 'nano' | 'micro' | 'mid' | 'macro' | 'mega';

const FOLLOWER_BANDS: Array<{ name: FollowerBand; min: number; max: number }> = [
  { name: 'nano', min: 0, max: 10_000 },
  { name: 'micro', min: 10_000, max: 100_000 },
  { name: 'mid', min: 100_000, max: 500_000 },
  { name: 'macro', min: 500_000, max: 1_000_000 },
  { name: 'mega', min: 1_000_000, max: Infinity },
];

function getFollowerBand(followerCount: number): FollowerBand {
  for (const band of FOLLOWER_BANDS) {
    if (followerCount >= band.min && followerCount < band.max) return band.name;
  }
  return 'mega';
}

// ── Scoring Functions ────────────────────────────────────────

/**
 * Authenticity band weight (Doc 15 B3).
 */
function getAuthenticityWeight(band: string | null): number {
  switch (band) {
    case 'strong': return 1.0;
    case 'moderate': return 0.7;
    case 'weak': return 0.4;
    default: return 0.2; // None / insufficient_data
  }
}

/**
 * Freshness decay — exponential with 30-day half-life.
 */
function computeFreshnessDecay(lastEnrichedAt: string | null): number {
  if (!lastEnrichedAt) return 0;
  const daysSince = (Date.now() - new Date(lastEnrichedAt).getTime()) / (1000 * 60 * 60 * 24);
  return Math.exp(-daysSince / 30);
}

/**
 * T5 long-tail fairness — size-band normalization.
 * Creators compete within their follower band, not against all sizes.
 * A 15k-follower creator can rank #1 for a micro-band query.
 */
function computeLongTailFairness(followerCount: number): number {
  const band = getFollowerBand(followerCount);
  const bandDef = FOLLOWER_BANDS.find((b) => b.name === band)!;
  const bandRange = bandDef.max - bandDef.min;
  const normalizedInRange = bandRange === Infinity
    ? 1.0
    : (followerCount - bandDef.min) / bandRange;
  // Score: 1.0 at top of band, 0.5 at bottom
  return 0.5 + normalizedInRange * 0.5;
}

/**
 * Criteria match — how well creator attributes match explicit filter criteria.
 */
function computeCriteriaMatch(
  hit: Record<string, unknown>,
  filters: Record<string, unknown>,
): number {
  const filterKeys = Object.keys(filters).filter(
    (k) => filters[k] !== undefined && filters[k] !== null && k !== 'sort_by' && k !== 'sort_order' && k !== 'page' && k !== 'limit',
  );
  if (filterKeys.length === 0) return 1.0;

  let matchCount = 0;
  for (const key of filterKeys) {
    const filterVal = filters[key];
    const hitVal = hit[key];
    if (hitVal === undefined || hitVal === null) continue;

    if (typeof filterVal === 'string' && typeof hitVal === 'string') {
      if (hitVal.toLowerCase() === filterVal.toLowerCase()) matchCount++;
    } else if (typeof filterVal === 'number' && typeof hitVal === 'number') {
      // For min/max ranges, check if within range
      if (key.endsWith('_min') && hitVal >= filterVal) matchCount++;
      else if (key.endsWith('_max') && hitVal <= filterVal) matchCount++;
      else if (hitVal === filterVal) matchCount++;
    }
  }
  return matchCount / filterKeys.length;
}

/**
 * Pakistan-first boost — workspace-aware, niche-aware.
 * Additive signal (not weighted) to keep independent of main ranking formula.
 */
function computePakistanBoost(
  creatorNiche: string,
  workspaceGeo: string | undefined,
  config: PakistanBoostConfig = DEFAULT_PAKISTAN_BOOST,
): { score: number; reason: string } {
  if (!config.enabled) return { score: 0, reason: 'disabled' };

  const isStrongNiche = PK_STRONG_NICHES.includes(creatorNiche);
  const isPakistanWorkspace = workspaceGeo === 'PK';

  if (isPakistanWorkspace && isStrongNiche) {
    return {
      score: config.baseWeight * config.strongNicheMultiplier,
      reason: 'PK workspace + strong niche',
    };
  }
  if (isPakistanWorkspace && !isStrongNiche) {
    return {
      score: config.baseWeight * config.weakNicheMultiplier,
      reason: 'PK workspace',
    };
  }
  if (!isPakistanWorkspace && isStrongNiche) {
    return {
      score: config.baseWeight * 0.75,
      reason: 'PK niche',
    };
  }
  return { score: 0, reason: '' };
}

// ── Ranking Explanation (CC-001) ─────────────────────────────

export interface RankingExplanation {
  relevance: { score: number; weight: number };
  criteriaMatch: { score: number; weight: number };
  authenticityWeight: { score: number; weight: number };
  qualityScore: { score: number; weight: number };
  freshnessDecay: { score: number; weight: number };
  longTailFairness: { score: number; weight: number };
  risingScore: { score: number; weight: number };
  pakistanBoost: { score: number; weight: number; reason: string };
  totalScore: number;
}

export interface RankedHit {
  [key: string]: unknown;
  _rankingScore: number;
  _explanation: RankingExplanation;
}

// ── Ranking Context ──────────────────────────────────────────

export interface RankingContext {
  weights?: RankingWeights;
  workspaceGeo?: string;
}

// ── Main Ranking Function ────────────────────────────────────

/**
 * Apply deterministic ranking to Meilisearch results.
 * All factors are from precomputed GCP attributes — zero LLM at query time.
 */
export function rankHits(
  hits: unknown[],
  filters: Record<string, unknown>,
  ctx: RankingContext = {},
): RankedHit[] {
  const weights = ctx.weights ?? DEFAULT_RANKING_WEIGHTS;

  // If rising_score is disabled, zero out its weight
  const effectiveWeights = RISING_SCORE_ENABLED
    ? weights
    : { ...weights, risingScore: 0 };

  return hits
    .map((hit) => {
      const h = hit as Record<string, unknown>;

      const relevanceScore = (h['_rankingScore'] as number) ?? 1.0; // Meilisearch relevance
      const criteriaScore = computeCriteriaMatch(h, filters);
      const authenticityScore = getAuthenticityWeight(h['authenticityBand'] as string | null);
      const qualityScore = ((h['qualityScore'] as number) ?? 0) / 100; // Normalize 0-100 → 0-1
      const freshnessScore = computeFreshnessDecay(h['lastEnrichedAt'] as string | null);
      const fairnessScore = computeLongTailFairness((h['followerCount'] as number) ?? 0);
      const risingScoreVal = (h['risingScore'] as number) ?? 0;

      // Pakistan boost (additive, not weighted)
      const pakistanBoost = computePakistanBoost(
        (h['primaryNiche'] as string) ?? '',
        ctx.workspaceGeo,
      );

      const totalScore =
        relevanceScore * effectiveWeights.relevance +
        criteriaScore * effectiveWeights.criteriaMatch +
        authenticityScore * effectiveWeights.authenticityWeight +
        qualityScore * effectiveWeights.qualityScore +
        freshnessScore * effectiveWeights.freshnessDecay +
        fairnessScore * effectiveWeights.longTailFairness +
        risingScoreVal * effectiveWeights.risingScore +
        pakistanBoost.score; // Additive

      const explanation: RankingExplanation = {
        relevance: { score: relevanceScore, weight: effectiveWeights.relevance },
        criteriaMatch: { score: criteriaScore, weight: effectiveWeights.criteriaMatch },
        authenticityWeight: { score: authenticityScore, weight: effectiveWeights.authenticityWeight },
        qualityScore: { score: qualityScore, weight: effectiveWeights.qualityScore },
        freshnessDecay: { score: freshnessScore, weight: effectiveWeights.freshnessDecay },
        longTailFairness: { score: fairnessScore, weight: effectiveWeights.longTailFairness },
        risingScore: { score: risingScoreVal, weight: effectiveWeights.risingScore },
        pakistanBoost: { score: pakistanBoost.score, weight: 1, reason: pakistanBoost.reason },
        totalScore,
      };

      return {
        ...h,
        _rankingScore: totalScore,
        _explanation: explanation,
      };
    })
    .sort((a, b) => b._rankingScore - a._rankingScore);
}
