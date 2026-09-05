/**
 * Discovery Orchestrator — "Two Brains" design.
 *
 * Pipeline: Serper (Google SERP) → Apify (scraping) → LLM (extraction/classification)
 *
 * Brain 1: Deterministic filtered search (zero LLM)
 * Brain 2: Natural language search (LLM translation)
 *
 * Source: Doc 15 (AI/Search/Discovery), Doc 16 (Data Flow)
 */
import { z } from 'zod';
import type { Database } from '@mushin/database';
import type { SerperAdapter, SerperSearchResult, ApifyAdapter, LLMAdapter } from '@mushin/adapters';
import { emitEvent, EVENT_TYPES } from '@mushin/events';

// ── Types ────────────────────────────────────────────────────

export interface DiscoveryJob {
  jobId: string;
  workspaceId: string;
  query: string;
  platform?: string;
  niche?: string;
  followerRange?: { min?: number; max?: number };
  status: 'queued' | 'searching' | 'scraping' | 'extracting' | 'completed' | 'failed';
  results: DiscoveryResult[];
  createdAt: Date;
  completedAt?: Date;
}

export interface DiscoveryResult {
  url: string;
  platform: string;
  handle?: string;
  displayName?: string;
  followerCount?: number;
  engagementRate?: number;
  niche?: string;
  confidence: number;
  source: 'serper' | 'apify' | 'llm';
}

const extractionSchema = z.object({
  handle: z.string().optional(),
  displayName: z.string().optional(),
  platform: z.string().optional(),
  niche: z.string().optional(),
  followerCount: z.number().optional(),
  engagementRate: z.number().optional(),
});

export interface DiscoveryConfig {
  maxResults: number;
  scrapeTimeout: number;
  llmTier: 'T-A' | 'T-B' | 'T-C';
}

// ── Orchestrator ─────────────────────────────────────────────

export class DiscoveryOrchestrator {
  private db: Database;
  private serper: SerperAdapter;
  private apify: ApifyAdapter;
  private llm: LLMAdapter;
  private config: DiscoveryConfig;

  constructor(
    db: Database,
    serper: SerperAdapter,
    apify: ApifyAdapter,
    llm: LLMAdapter,
    config?: Partial<DiscoveryConfig>,
  ) {
    this.db = db;
    this.serper = serper;
    this.apify = apify;
    this.llm = llm;
    this.config = {
      maxResults: config?.maxResults ?? 20,
      scrapeTimeout: config?.scrapeTimeout ?? 120,
      llmTier: config?.llmTier ?? 'T-A',
    };
  }

  /**
   * Execute a discovery job.
   * Pipeline: Serper → Apify → LLM extraction
   */
  async discover(job: DiscoveryJob): Promise<DiscoveryResult[]> {
    // Update status
    job.status = 'searching';

    // Stage 1: Search via Serper
    const searchResults = await this.searchStage(job);

    // Emit stage completed event
    await this.emitStageEvent(job, 'search_completed', searchResults.length);

    // Stage 2: Scrape via Apify (for top results)
    job.status = 'scraping';
    const scrapeResults = await this.scrapeStage(job, searchResults);

    await this.emitStageEvent(job, 'scrape_completed', scrapeResults.length);

    // Stage 3: Extract/classify via LLM
    job.status = 'extracting';
    const extractedResults = await this.extractionStage(job, scrapeResults);

    await this.emitStageEvent(job, 'extraction_completed', extractedResults.length);

    // Complete
    job.status = 'completed';
    job.completedAt = new Date();
    job.results = extractedResults;

    return extractedResults;
  }

  // ── Stage 1: Search ────────────────────────────────────────

  private async searchStage(job: DiscoveryJob): Promise<DiscoveryResult[]> {
    const query = this.buildSearchQuery(job);
    const results = await this.serper.search(query, {
      numResults: this.config.maxResults,
    });

    return results.map((r: SerperSearchResult) => ({
      url: r.link,
      platform: this.extractPlatform(r.link),
      handle: this.extractHandle(r.link),
      displayName: r.title,
      confidence: 0.5, // Base confidence from search
      source: 'serper' as const,
    }));
  }

  // ── Stage 2: Scrape ────────────────────────────────────────

  private async scrapeStage(
    job: DiscoveryJob,
    searchResults: DiscoveryResult[],
  ): Promise<DiscoveryResult[]> {
    const results: DiscoveryResult[] = [];
    const urlsToScrape = searchResults
      .filter((r) => r.platform !== 'unknown')
      .slice(0, 5); // Limit scraping to top 5

    for (const result of urlsToScrape) {
      try {
        const actorId = this.getActorForPlatform(result.platform);
        if (!actorId) {
          results.push(result);
          continue;
        }

        const items = await this.apify.runActor(
          actorId,
          { urls: [result.url] },
          { timeoutSecs: this.config.scrapeTimeout },
        );

        if (items.length > 0) {
          const scraped = items[0]!;
          results.push({
            ...result,
            handle: (scraped['handle'] as string) ?? result.handle,
            displayName: (scraped['displayName'] as string) ?? result.displayName,
            followerCount: scraped['followerCount'] as number | undefined,
            engagementRate: scraped['engagementRate'] as number | undefined,
            confidence: 0.7, // Higher confidence with scraped data
          });
        } else {
          results.push(result);
        }
      } catch (err) {
        // Scraping failed for this URL — keep search result
        console.warn(`[Discovery] Scrape failed for ${result.url}:`, err);
        results.push(result);
      }
    }

    return results;
  }

  // ── Stage 3: LLM Extraction ────────────────────────────────

  private async extractionStage(
    job: DiscoveryJob,
    scrapeResults: DiscoveryResult[],
  ): Promise<DiscoveryResult[]> {
    const results: DiscoveryResult[] = [];

    for (const result of scrapeResults) {
      try {
        const extraction = await this.llm.call(
          this.config.llmTier,
          'Extract creator information from the following data. Return JSON with: handle, displayName, platform, niche, followerCount, engagementRate',
          JSON.stringify(result),
          extractionSchema,
        );

        if (extraction.success) {
          results.push({
            ...result,
            niche: (extraction.data as Record<string, unknown>)?.['niche'] as string | undefined,
            confidence: 0.9, // Highest confidence with LLM extraction
          });
        } else {
          results.push(result);
        }
      } catch (err) {
        // LLM extraction failed — keep existing data
        console.warn(`[Discovery] LLM extraction failed for ${result.url}:`, err);
        results.push(result);
      }
    }

    return results;
  }

  // ── Helpers ────────────────────────────────────────────────

  private buildSearchQuery(job: DiscoveryJob): string {
    const parts: string[] = [job.query];

    if (job.platform) {
      parts.push(`site:${job.platform}.com`);
    }

    if (job.niche) {
      parts.push(job.niche);
    }

    if (job.followerRange) {
      if (job.followerRange.min) {
        parts.push(`followers > ${job.followerRange.min}`);
      }
    }

    return parts.join(' ');
  }

  private extractPlatform(url: string): string {
    const domain = new URL(url).hostname.replace('www.', '');
    if (domain.includes('instagram')) return 'instagram';
    if (domain.includes('tiktok')) return 'tiktok';
    if (domain.includes('youtube')) return 'youtube';
    if (domain.includes('twitter') || domain.includes('x.com')) return 'twitter';
    return 'unknown';
  }

  private extractHandle(url: string): string | undefined {
    try {
      const path = new URL(url).pathname;
      const parts = path.split('/').filter(Boolean);
      return parts[0] ? `@${parts[0]}` : undefined;
    } catch {
      return undefined;
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

  private async emitStageEvent(
    job: DiscoveryJob,
    stage: string,
    resultCount: number,
  ): Promise<void> {
    try {
      await emitEvent(this.db as Parameters<typeof emitEvent>[0], {
        eventId: crypto.randomUUID(),
        type: EVENT_TYPES.DISCOVERY_STAGE_COMPLETED,
        schemaVersion: 1,
        scopeClass: 'WP',
        workspaceId: job.workspaceId,
        actor: { type: 'system', id: 'discovery-orchestrator' },
        correlationId: job.jobId,
        occurredAt: new Date(),
        payload: {
          jobId: job.jobId,
          stage,
          resultCount,
        },
      });
    } catch (err) {
      console.warn('[Discovery] Failed to emit stage event:', err);
    }
  }
}

// ── Factory ──────────────────────────────────────────────────

export function createDiscoveryOrchestrator(
  db: Database,
  serper: SerperAdapter,
  apify: ApifyAdapter,
  llm: LLMAdapter,
  config?: Partial<DiscoveryConfig>,
): DiscoveryOrchestrator {
  return new DiscoveryOrchestrator(db, serper, apify, llm, config);
}
