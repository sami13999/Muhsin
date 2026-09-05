/**
 * Cross-Platform Discovery Service.
 *
 * ADR-029: Uses the same evidence-weighting philosophy as identity resolution.
 * NOT a second, divergent scoring system.
 *
 * This service finds a creator's presence across multiple platforms
 * and generates identity evidence for merging/linking.
 *
 * Source: Master Implementation Plan Phase 11
 * Independently deployable/disableable (plugin architecture).
 */
import { sql } from 'drizzle-orm';
import type { Database } from '@mushin/database';
import type { SerperAdapter, ApifyAdapter, LLMAdapter } from '@mushin/adapters';
import { calculateIdentityScore, type CreatorIdentityData, type EvidenceSignal } from '@mushin/database';
import { emitEvent, EVENT_TYPES } from '@mushin/events';

// ── Types ────────────────────────────────────────────────────

export interface CrossPlatformResult {
  sourceCreatorId: string;
  targetPlatform: string;
  targetHandle: string | null;
  targetUrl: string | null;
  confidence: number;
  evidence: EvidenceSignal[];
  mergeStatus: 'active' | 'candidate' | 'independent';
  humanReviewRequired: boolean;
}

export interface CrossPlatformJob {
  jobId: string;
  workspaceId: string;
  creatorId: string;
  targetPlatforms: string[];
  status: 'queued' | 'searching' | 'matching' | 'completed' | 'failed';
  results: CrossPlatformResult[];
  createdAt: Date;
  completedAt?: Date;
}

// ── Service ──────────────────────────────────────────────────

export class CrossPlatformDiscoveryService {
  private db: Database;
  private serper: SerperAdapter;
  private apify: ApifyAdapter;
  private llm: LLMAdapter;

  constructor(
    db: Database,
    serper: SerperAdapter,
    apify: ApifyAdapter,
    llm: LLMAdapter,
  ) {
    this.db = db;
    this.serper = serper;
    this.apify = apify;
    this.llm = llm;
  }

  /**
   * Discover a creator's presence on other platforms.
   * Uses identity resolution scoring (ADR-029) for matching.
   */
  async discoverCrossPlatform(job: CrossPlatformJob): Promise<CrossPlatformResult[]> {
    // 1. Get source creator data
    const sourceData = await this.getCreatorData(job.creatorId);
    if (!sourceData) {
      throw new Error('Source creator not found');
    }

    // 2. Search each target platform
    const results: CrossPlatformResult[] = [];

    for (const platform of job.targetPlatforms) {
      try {
        const result = await this.searchPlatform(sourceData, platform);
        if (result) {
          results.push(result);
        }
      } catch (err) {
        console.warn(`[CrossPlatform] Failed to search ${platform}:`, err);
      }
    }

    // 3. Emit event
    await this.emitDiscoveryEvent(job, results);

    return results;
  }

  // ── Private Methods ────────────────────────────────────────

  private async getCreatorData(creatorId: string): Promise<CreatorIdentityData | null> {
    const result = await this.db.execute(sql`
      SELECT
        c.creator_id,
        c.display_name,
        c.primary_handle,
        c.minor_signal,
        p.platform,
        p.handle,
        p.canonical_url,
        p.follower_count,
        p.engagement_rate
      FROM gcp.creator c
      LEFT JOIN gcp.profile p ON c.creator_id = p.creator_id
      WHERE c.creator_id = ${creatorId}
    `);

    if (result.length === 0) return null;

    const row = result[0]!;
    return {
      creatorId: row['creator_id'] as string,
      displayName: row['display_name'] as string | null,
      primaryHandle: row['primary_handle'] as string | null,
      platformData: {
        platform: row['platform'],
        handle: row['handle'],
        canonicalUrl: row['canonical_url'],
        followerCount: row['follower_count'],
        engagementRate: row['engagement_rate'],
      },
    };
  }

  private async searchPlatform(
    source: CreatorIdentityData,
    targetPlatform: string,
  ): Promise<CrossPlatformResult | null> {
    // Build search query
    const query = this.buildSearchQuery(source, targetPlatform);

    // Search via Serper
    const searchResults = await this.serper.searchSocialProfiles(query, targetPlatform);

    if (searchResults.length === 0) return null;

    // Take top result
    const topResult = searchResults[0]!;

    // Scrape profile data
    const profileData = await this.scrapeProfile(topResult.link, targetPlatform);

    // Create candidate identity data
    const candidate: CreatorIdentityData = {
      creatorId: 'candidate',
      displayName: profileData['displayName'] as string | null ?? topResult.title,
      primaryHandle: profileData['handle'] as string | null,
      platformData: profileData,
    };

    // Calculate identity score using ADR-029
    const score = calculateIdentityScore(source, candidate);

    return {
      sourceCreatorId: source.creatorId,
      targetPlatform,
      targetHandle: candidate.primaryHandle ?? null,
      targetUrl: topResult.link,
      confidence: score.confidence,
      evidence: score.evidenceBreakdown,
      mergeStatus: score.mergeStatus,
      humanReviewRequired: score.humanReviewRequired,
    };
  }

  private buildSearchQuery(source: CreatorIdentityData, platform: string): string {
    const parts: string[] = [];

    if (source.displayName) {
      parts.push(source.displayName);
    }

    if (source.primaryHandle) {
      parts.push(source.primaryHandle.replace('@', ''));
    }

    parts.push(`site:${platform}.com`);

    return parts.join(' ');
  }

  private async scrapeProfile(url: string, platform: string): Promise<Record<string, unknown>> {
    const actorId = this.getActorForPlatform(platform);
    if (!actorId) return {};

    try {
      const items = await this.apify.runActor(actorId, { urls: [url] }, { timeoutSecs: 60 });
      return items[0] ?? {};
    } catch {
      return {};
    }
  }

  private getActorForPlatform(platform: string): string | null {
    const actors: Record<string, string> = {
      instagram: 'apify/instagram-profile-scraper',
      tiktok: 'apify/tiktok-profile-scraper',
      youtube: 'apify/youtube-channel-scraper',
      twitter: 'apify/twitter-profile-scraper',
    };
    return actors[platform] ?? null;
  }

  private async emitDiscoveryEvent(
    job: CrossPlatformJob,
    results: CrossPlatformResult[],
  ): Promise<void> {
    try {
      await emitEvent(this.db as Parameters<typeof emitEvent>[0], {
        eventId: crypto.randomUUID(),
        type: 'creator.cross_platform_discovered',
        schemaVersion: 1,
        scopeClass: 'GCP',
        workspaceId: job.workspaceId,
        actor: { type: 'system', id: 'cross-platform-discovery' },
        correlationId: job.jobId,
        occurredAt: new Date(),
        payload: {
          creatorId: job.creatorId,
          results: results.map((r) => ({
            platform: r.targetPlatform,
            handle: r.targetHandle,
            confidence: r.confidence,
            mergeStatus: r.mergeStatus,
          })),
        },
      });
    } catch (err) {
      console.warn('[CrossPlatform] Failed to emit event:', err);
    }
  }
}

// ── Factory ──────────────────────────────────────────────────

export function createCrossPlatformDiscoveryService(
  db: Database,
  serper: SerperAdapter,
  apify: ApifyAdapter,
  llm: LLMAdapter,
): CrossPlatformDiscoveryService {
  return new CrossPlatformDiscoveryService(db, serper, apify, llm);
}
