/**
 * Rising Score Service.
 * Computes rising_score from historical enrichment snapshots.
 * Deterministic: identical snapshot history → identical score. No randomness.
 *
 * Inputs:
 * - followerGrowthVelocity: followers gained per day (normalized)
 * - engagementGrowthVelocity: engagement rate change per day (normalized)
 * - qualityScoreDelta: quality score improvement (0-1)
 * - authenticityTrendStability: 0-1, penalizes erratic patterns
 */
import { GrowthMetricsBase } from './growth-metrics.service.js';

export interface RisingScoreInputs {
  followerGrowthVelocity: number;
  engagementGrowthVelocity: number;
  qualityScoreDelta: number;
  authenticityTrendStability: number;
}

export interface RisingScoreResult {
  score: number;
  inputs: RisingScoreInputs;
  computedAt: string;
}

const RISING_WEIGHTS = {
  followerGrowth: 0.35,
  engagementGrowth: 0.30,
  qualityDelta: 0.20,
  authenticityStability: 0.15,
};

const SNAPSHOT_LOOKBACK_DAYS = 90;

export class GrowthService extends GrowthMetricsBase {
  /**
   * Compute rising_score for a single creator.
   * Pure computation from snapshot history — no LLM, no randomness.
   */
  async computeRisingScore(creatorId: string): Promise<RisingScoreResult> {
    const snapshots = await this.getSnapshotHistory(creatorId, SNAPSHOT_LOOKBACK_DAYS);

    if (snapshots.length < 2) {
      return {
        score: 0,
        inputs: {
          followerGrowthVelocity: 0,
          engagementGrowthVelocity: 0,
          qualityScoreDelta: 0,
          authenticityTrendStability: 0,
        },
        computedAt: new Date().toISOString(),
      };
    }

    const deltas = this.computeDeltas(snapshots);

    // Average growth velocity (per day)
    let totalFollowerGrowth = 0;
    let totalEngagementGrowth = 0;
    let totalQualityDelta = 0;
    let totalAuthenticityStability = 0;

    for (const delta of deltas) {
      totalFollowerGrowth += delta.followerDelta / delta.daysBetween;
      totalEngagementGrowth += delta.engagementDelta / delta.daysBetween;
      totalQualityDelta += delta.qualityDelta;
      totalAuthenticityStability += delta.authenticityStability;
    }

    const avgFollowerGrowth = totalFollowerGrowth / deltas.length;
    const avgEngagementGrowth = totalEngagementGrowth / deltas.length;
    const avgQualityDelta = totalQualityDelta / deltas.length;
    const avgAuthenticityStability = totalAuthenticityStability / deltas.length;

    // Normalize to 0-1 using sigmoid
    const followerScore = this.sigmoidNormalize(avgFollowerGrowth * 100, 0.5);
    const engagementScore = this.sigmoidNormalize(avgEngagementGrowth * 1000, 0.5);
    const qualityScore = this.normalizeDelta(avgQualityDelta, -0.5, 0.5);
    const authenticityScore = avgAuthenticityStability;

    // Weighted sum
    const score =
      followerScore * RISING_WEIGHTS.followerGrowth +
      engagementScore * RISING_WEIGHTS.engagementGrowth +
      qualityScore * RISING_WEIGHTS.qualityDelta +
      authenticityScore * RISING_WEIGHTS.authenticityStability;

    return {
      score: Math.max(0, Math.min(1, score)),
      inputs: {
        followerGrowthVelocity: followerScore,
        engagementGrowthVelocity: engagementScore,
        qualityScoreDelta: qualityScore,
        authenticityTrendStability: authenticityScore,
      },
      computedAt: new Date().toISOString(),
    };
  }

  /**
   * Batch compute rising_scores for multiple creators.
   */
  async computeRisingScoresBatch(
    creatorIds: string[],
  ): Promise<Map<string, RisingScoreResult>> {
    const results = new Map<string, RisingScoreResult>();

    for (const creatorId of creatorIds) {
      const result = await this.computeRisingScore(creatorId);
      results.set(creatorId, result);
    }

    return results;
  }
}
