/**
 * Analytics & Reporting Service.
 *
 * Source: Doc 10 (Analytics), Doc 12 (Analytics/Reporting)
 *
 * Provides:
 * - Workspace analytics (credit usage, outreach metrics)
 * - Creator analytics (engagement, growth)
 * - Benchmarking (compare against platform averages)
 * - Export functionality
 */
import type { Database } from '@mushin/database';
import { sql } from 'drizzle-orm';

// ── Types ────────────────────────────────────────────────────

export interface WorkspaceAnalytics {
  workspaceId: string;
  period: string;
  creditUsage: {
    total: number;
    byCategory: Record<string, number>;
  };
  outreachMetrics: {
    sent: number;
    delivered: number;
    opened: number;
    replied: number;
    bounced: number;
  };
  creatorMetrics: {
    totalCreators: number;
    activeCreators: number;
    newListCreators: number;
  };
}

export interface CreatorAnalytics {
  creatorId: string;
  platform: string;
  metrics: {
    followerCount: number;
    engagementRate: number;
    growthRate: number;
    authenticityScore: number | null;
    qualityScore: number | null;
  };
  trends: Array<{
    date: string;
    followers: number;
    engagement: number;
  }>;
}

export interface BenchmarkData {
  platform: string;
  niche: string;
  metrics: {
    avgFollowerCount: number;
    avgEngagementRate: number;
    medianFollowerCount: number;
    medianEngagementRate: number;
  };
  sampleSize: number;
}

export interface ExportOptions {
  format: 'csv' | 'json';
  dateRange?: { start: Date; end: Date };
  columns?: string[];
}

// ── Service ──────────────────────────────────────────────────

export class AnalyticsService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Get workspace analytics for a period.
   */
  async getWorkspaceAnalytics(
    workspaceId: string,
    period: string,
  ): Promise<WorkspaceAnalytics> {
    // Credit usage
    const creditUsage = await this.getCreditUsage(workspaceId, period);

    // Outreach metrics
    const outreachMetrics = await this.getOutreachMetrics(workspaceId, period);

    // Creator metrics
    const creatorMetrics = await this.getCreatorMetrics(workspaceId);

    return {
      workspaceId,
      period,
      creditUsage,
      outreachMetrics,
      creatorMetrics,
    };
  }

  /**
   * Get creator analytics.
   */
  async getCreatorAnalytics(creatorId: string): Promise<CreatorAnalytics> {
    const result = await this.db.execute(sql`
      SELECT
        c.creator_id,
        p.platform,
        p.follower_count,
        p.engagement_rate,
        es.verdict->>'score' AS quality_score
      FROM gcp.creator c
      LEFT JOIN gcp.profile p ON c.creator_id = p.creator_id
      LEFT JOIN gcp.enrichment_snapshot es ON c.creator_id = es.creator_id
        AND es.snapshot_type = 'quality' AND es.is_current = true
      WHERE c.creator_id = ${creatorId}
    `);

    if (result.length === 0) {
      throw new Error('Creator not found');
    }

    const row = result[0]!;

    return {
      creatorId,
      platform: (row['platform'] as string) ?? 'unknown',
      metrics: {
        followerCount: Number(row['follower_count'] ?? 0),
        engagementRate: Number(row['engagement_rate'] ?? 0),
        growthRate: 0, // Would need historical data
        authenticityScore: null, // Would need enrichment data
        qualityScore: row['quality_score'] ? Number(row['quality_score']) : null,
      },
      trends: [], // Would need time-series data
    };
  }

  /**
   * Get benchmark data for a platform/niche combination.
   */
  async getBenchmark(platform: string, niche: string): Promise<BenchmarkData> {
    const result = await this.db.execute(sql`
      SELECT
        COUNT(*) AS sample_size,
        AVG(p.follower_count) AS avg_followers,
        AVG(p.engagement_rate) AS avg_engagement,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY p.follower_count) AS median_followers,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY p.engagement_rate) AS median_engagement
      FROM gcp.profile p
      JOIN gcp.niche_classification nc ON p.creator_id = nc.creator_id
      WHERE p.platform = ${platform}
        AND nc.primary_niche = ${niche}
        AND nc.is_current = true
    `);

    const row = result[0]!;

    return {
      platform,
      niche,
      metrics: {
        avgFollowerCount: Number(row['avg_followers'] ?? 0),
        avgEngagementRate: Number(row['avg_engagement'] ?? 0),
        medianFollowerCount: Number(row['median_followers'] ?? 0),
        medianEngagementRate: Number(row['median_engagement'] ?? 0),
      },
      sampleSize: Number(row['sample_size'] ?? 0),
    };
  }

  /**
   * Export data in CSV or JSON format.
   */
  async exportCreators(
    workspaceId: string,
    options: ExportOptions,
  ): Promise<string> {
    const result = await this.db.execute(sql`
      SELECT
        c.creator_id,
        c.display_name,
        c.primary_handle,
        p.platform,
        p.follower_count,
        p.engagement_rate,
        nc.primary_niche,
        wcl.tags,
        wcl.first_linked_at
      FROM gcp.creator c
      JOIN wp.workspace_creator_link wcl ON c.creator_id = wcl.creator_id
      LEFT JOIN gcp.profile p ON c.creator_id = p.creator_id
      LEFT JOIN gcp.niche_classification nc ON c.creator_id = nc.creator_id AND nc.is_current = true
      WHERE wcl.workspace_id = ${workspaceId}
        AND wcl.workspace_removed_at IS NULL
    `);

    if (options.format === 'csv') {
      return this.toCSV(result);
    }

    return JSON.stringify(result, null, 2);
  }

  // ── Private Helpers ────────────────────────────────────────

  private async getCreditUsage(
    workspaceId: string,
    period: string,
  ): Promise<{ total: number; byCategory: Record<string, number> }> {
    const result = await this.db.execute(sql`
      SELECT
        entry_type,
        SUM(ABS(amount)) AS total
      FROM wp.credit_ledger_entry
      WHERE workspace_id = ${workspaceId}
        AND period = ${period}
        AND amount < 0
      GROUP BY entry_type
    `);

    const byCategory: Record<string, number> = {};
    let total = 0;

    for (const row of result) {
      const category = row['entry_type'] as string;
      const amount = Number(row['total']);
      byCategory[category] = amount;
      total += amount;
    }

    return { total, byCategory };
  }

  private async getOutreachMetrics(
    workspaceId: string,
    period: string,
  ): Promise<{ sent: number; delivered: number; opened: number; replied: number; bounced: number }> {
    const result = await this.db.execute(sql`
      SELECT
        COUNT(CASE WHEN event_type = 'outreach.message_sent' THEN 1 END) AS sent,
        COUNT(CASE WHEN event_type = 'outreach.message_delivered' THEN 1 END) AS delivered,
        COUNT(CASE WHEN event_type = 'outreach.opened' THEN 1 END) AS opened,
        COUNT(CASE WHEN event_type = 'outreach.reply_received' THEN 1 END) AS replied,
        COUNT(CASE WHEN event_type = 'outreach.message_failed' THEN 1 END) AS bounced
      FROM wp.interaction_timeline
      WHERE workspace_id = ${workspaceId}
        AND created_at >= ${period}-01::date
        AND created_at < (${period}-01::date + INTERVAL '1 month')
    `);

    const row = result[0]!;

    return {
      sent: Number(row['sent'] ?? 0),
      delivered: Number(row['delivered'] ?? 0),
      opened: Number(row['opened'] ?? 0),
      replied: Number(row['replied'] ?? 0),
      bounced: Number(row['bounced'] ?? 0),
    };
  }

  private async getCreatorMetrics(
    workspaceId: string,
  ): Promise<{ totalCreators: number; activeCreators: number; newListCreators: number }> {
    const result = await this.db.execute(sql`
      SELECT
        COUNT(*) AS total,
        COUNT(CASE WHEN last_active_at > NOW() - INTERVAL '30 days' THEN 1 END) AS active
      FROM wp.workspace_creator_link
      WHERE workspace_id = ${workspaceId}
        AND workspace_removed_at IS NULL
    `);

    const row = result[0]!;

    return {
      totalCreators: Number(row['total'] ?? 0),
      activeCreators: Number(row['active'] ?? 0),
      newListCreators: 0, // Would need list membership data
    };
  }

  private toCSV(data: unknown[]): string {
    if (data.length === 0) return '';

    const rows = data as Record<string, unknown>[];
    const headers = Object.keys(rows[0]!);
    const csvRows = [headers.join(',')];

    for (const row of rows) {
      const values = headers.map((h) => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
        return String(val);
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }
}

// ── Factory ──────────────────────────────────────────────────

export function createAnalyticsService(db: Database): AnalyticsService {
  return new AnalyticsService(db);
}
