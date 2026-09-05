/**
 * Trending Score Service.
 * Computes trending_score from historical enrichment snapshots.
 * Deterministic: identical snapshot history → identical score. No randomness.
 *
 * Trending is a short-term momentum signal (acceleration + recent growth).
 * Distinct from rising_score (sustained trajectory).
 *
 * Inputs:
 * - followerAcceleration: 2nd derivative of follower count
 * - engagementAcceleration: 2nd derivative of engagement rate
 * - recentGrowthRate: growth in last 7 days vs previous 30 days
 * - momentumDecay: exponential decay from peak growth moment
 */
import { GrowthMetricsBase } from './growth-metrics.service.js';

export interface TrendingScoreInputs {
  followerAcceleration: number;
  engagementAcceleration: number;
  recentGrowthRate: number;
  momentumDecay: number;
}

export interface TrendingScoreResult {
  score: number;
  inputs: TrendingScoreInputs;
  trendDirection: 'accelerating' | 'steady' | 'decelerating';
  computedAt: string;
}

const TRENDING_WEIGHTS = {
  followerAcceleration: 0.30,
  engagementAcceleration: 0.25,
  recentGrowthRate: 0.25,
  momentumDecay: 0.20,
};

const SNAPSHOT_LOOKBACK_DAYS = 60;
const RECENT_WINDOW_DAYS = 7;
const BASELINE_WINDOW_DAYS = 30;
const MOMENTUM_HALF_LIFE_DAYS = 14;

export class TrendingService extends GrowthMetricsBase {
  /**
   * Compute trending_score for a single creator.
   * Pure computation from snapshot history — no LLM, no randomness.
   */
  async computeTrendingScore(creatorId: string): Promise<TrendingScoreResult> {
    const snapshots = await this.getSnapshotHistory(creatorId, SNAPSHOT_LOOKBACK_DAYS);

    if (snapshots.length < 3) {
      return {
        score: 0,
        inputs: {
          followerAcceleration: 0,
          engagementAcceleration: 0,
          recentGrowthRate: 0,
          momentumDecay: 0,
        },
        trendDirection: 'steady',
        computedAt: new Date().toISOString(),
      };
    }

    const deltas = this.computeDeltas(snapshots);

    // Compute acceleration (2nd derivative) — rate of change of growth rate
    let totalFollowerAcceleration = 0;
    let totalEngagementAcceleration = 0;
    for (let i = 1; i < deltas.length; i++) {
      const prev = deltas[i - 1]!;
      const curr = deltas[i]!;
      totalFollowerAcceleration += (curr.followerDelta - prev.followerDelta) / curr.daysBetween;
      totalEngagementAcceleration += (curr.engagementDelta - prev.engagementDelta) / curr.daysBetween;
    }
    const avgFollowerAcceleration = deltas.length > 1
      ? totalFollowerAcceleration / (deltas.length - 1)
      : 0;
    const avgEngagementAcceleration = deltas.length > 1
      ? totalEngagementAcceleration / (deltas.length - 1)
      : 0;

    // Compute recent vs baseline growth rate
    const now = Date.now();
    const recentCutoff = now - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const baselineCutoff = now - BASELINE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    let recentFollowerGrowth = 0;
    let baselineFollowerGrowth = 0;
    let recentCount = 0;
    let baselineCount = 0;

    for (const delta of deltas) {
      const deltaTime = delta.daysBetween * 24 * 60 * 60 * 1000;
      if (deltaTime >= recentCutoff) {
        recentFollowerGrowth += delta.followerDelta;
        recentCount++;
      } else if (deltaTime >= baselineCutoff) {
        baselineFollowerGrowth += delta.followerDelta;
        baselineCount++;
      }
    }

    const avgRecentGrowth = recentCount > 0 ? recentFollowerGrowth / recentCount : 0;
    const avgBaselineGrowth = baselineCount > 0 ? baselineFollowerGrowth / baselineCount : 0;
    const recentGrowthRate = avgBaselineGrowth > 0
      ? (avgRecentGrowth - avgBaselineGrowth) / Math.abs(avgBaselineGrowth)
      : avgRecentGrowth > 0 ? 1 : 0;

    // Compute momentum decay from peak growth
    let peakGrowthDay = 0;
    let maxGrowth = 0;
    let dayAccumulator = 0;
    for (const delta of deltas) {
      if (delta.followerDelta > maxGrowth) {
        maxGrowth = delta.followerDelta;
        peakGrowthDay = dayAccumulator;
      }
      dayAccumulator += delta.daysBetween;
    }
    const daysSincePeak = dayAccumulator - peakGrowthDay;
    const momentumDecay = Math.exp(-daysSincePeak / MOMENTUM_HALF_LIFE_DAYS);

    // Normalize to 0-1 using sigmoid
    const followerAccelScore = this.sigmoidNormalize(avgFollowerAcceleration * 1000, 0.5);
    const engagementAccelScore = this.sigmoidNormalize(avgEngagementAcceleration * 10000, 0.5);
    const recentGrowthScore = this.sigmoidNormalize(recentGrowthRate, 0.5);
    const momentumScore = momentumDecay;

    // Weighted sum
    const score =
      followerAccelScore * TRENDING_WEIGHTS.followerAcceleration +
      engagementAccelScore * TRENDING_WEIGHTS.engagementAcceleration +
      recentGrowthScore * TRENDING_WEIGHTS.recentGrowthRate +
      momentumScore * TRENDING_WEIGHTS.momentumDecay;

    // Determine trend direction
    let trendDirection: TrendingScoreResult['trendDirection'] = 'steady';
    if (avgFollowerAcceleration > 0.01) trendDirection = 'accelerating';
    else if (avgFollowerAcceleration < -0.01) trendDirection = 'decelerating';

    return {
      score: Math.max(0, Math.min(1, score)),
      inputs: {
        followerAcceleration: followerAccelScore,
        engagementAcceleration: engagementAccelScore,
        recentGrowthRate: recentGrowthScore,
        momentumDecay: momentumScore,
      },
      trendDirection,
      computedAt: new Date().toISOString(),
    };
  }

  /**
   * Batch compute trending_scores for multiple creators.
   */
  async computeTrendingScoresBatch(
    creatorIds: string[],
  ): Promise<Map<string, TrendingScoreResult>> {
    const results = new Map<string, TrendingScoreResult>();

    for (const creatorId of creatorIds) {
      const result = await this.computeTrendingScore(creatorId);
      results.set(creatorId, result);
    }

    return results;
  }
}
