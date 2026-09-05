/**
 * Growth Metrics Base Service.
 * Shared computation for rising_score and trending_score.
 * Pure computation from enrichment snapshot history — zero LLM, zero randomness.
 */
import { sql } from 'drizzle-orm';
import type { Database } from '@mushin/database';

export interface SnapshotDelta {
  snapshotId: string;
  createdAt: Date;
  followerCount: number | null;
  engagementRate: number | null;
  qualityScore: number | null;
  authenticityBand: string | null;
}

export abstract class GrowthMetricsBase {
  constructor(protected db: Database) {}

  /**
   * Query enrichment snapshot history for a creator.
   * Returns ordered snapshots (oldest first) for delta computation.
   */
  protected async getSnapshotHistory(
    creatorId: string,
    days: number,
  ): Promise<SnapshotDelta[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const rows = await this.db.execute(sql`
      SELECT 
        es.snapshot_id,
        es.created_at,
        (es.verdict->>'follower_count')::bigint as follower_count,
        (es.verdict->>'engagement_rate')::numeric as engagement_rate,
        (es.verdict->>'score')::numeric as quality_score,
        es.verdict->>'band' as authenticity_band
      FROM gcp.enrichment_snapshot es
      WHERE es.creator_id = ${creatorId}
        AND es.is_current = TRUE
        AND es.created_at >= ${cutoff}
      ORDER BY es.created_at ASC
    `);

    return rows.map((row) => ({
      snapshotId: row['snapshot_id'] as string,
      createdAt: new Date(row['created_at'] as string),
      followerCount: row['follower_count'] != null ? Number(row['follower_count']) : null,
      engagementRate: row['engagement_rate'] != null ? Number(row['engagement_rate']) : null,
      qualityScore: row['quality_score'] != null ? Number(row['quality_score']) : null,
      authenticityBand: row['authenticity_band'] as string | null,
    }));
  }

  /**
   * Compute deltas between consecutive snapshots.
   */
  protected computeDeltas(snapshots: SnapshotDelta[]): Array<{
    followerDelta: number;
    engagementDelta: number;
    qualityDelta: number;
    daysBetween: number;
    authenticityStability: number;
  }> {
    const deltas: Array<{
      followerDelta: number;
      engagementDelta: number;
      qualityDelta: number;
      daysBetween: number;
      authenticityStability: number;
    }> = [];

    for (let i = 1; i < snapshots.length; i++) {
      const prev = snapshots[i - 1]!;
      const curr = snapshots[i]!;

      const daysBetween = Math.max(
        1,
        (curr.createdAt.getTime() - prev.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );

      const followerDelta =
        prev.followerCount != null && curr.followerCount != null && prev.followerCount > 0
          ? (curr.followerCount - prev.followerCount) / prev.followerCount
          : 0;

      const engagementDelta =
        prev.engagementRate != null && curr.engagementRate != null
          ? Number(curr.engagementRate) - Number(prev.engagementRate)
          : 0;

      const qualityDelta =
        prev.qualityScore != null && curr.qualityScore != null
          ? Number(curr.qualityScore) - Number(prev.qualityScore)
          : 0;

      const authenticityStability =
        prev.authenticityBand === curr.authenticityBand ? 1.0 : 0.5;

      deltas.push({
        followerDelta,
        engagementDelta,
        qualityDelta,
        daysBetween,
        authenticityStability,
      });
    }

    return deltas;
  }

  /**
   * Normalize a value to 0-1 range using sigmoid.
   */
  protected sigmoidNormalize(value: number, steepness: number = 1): number {
    return 1 / (1 + Math.exp(-steepness * value));
  }

  /**
   * Normalize a delta to 0-1 range.
   */
  protected normalizeDelta(delta: number, min: number, max: number): number {
    if (max === min) return 0.5;
    return Math.max(0, Math.min(1, (delta - min) / (max - min)));
  }
}
