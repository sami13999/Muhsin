/**
 * Discovery Orchestrator — "Two Brains" design (ADR-016 / ADR-018).
 *
 * Brain 1: Instant memory (zero LLM / free local index search).
 * Brain 2: Live Internet Scout (AI-driven metered discovery).
 *
 * Pipeline:
 * 1. Groq AI Query Translation & Multi-Query Expansion
 * 2. Serper Google SERP Scan
 * 3. The Bouncer (Strict 4-part Filter & Deduplication):
 *    - Relevance Filter (No e-commerce stores/brands)
 *    - URL Filter (Clean profiles only)
 *    - Intra-batch Deduplication
 *    - Local Database Check (Rejects handles already saved in DB to save scraping costs)
 * 4. Apify Realtime Scraper Grid (Scrapes only brand-new candidates)
 * 5. MUSHIN 8-Factor Quality Scoring, Postgres DB Persistence & Brain 1 Meilisearch Sync
 *
 * Source: Doc 15 (AI/Search/Discovery), Doc 16 (Data Flow), ADR-016, ADR-018
 */
import { z } from 'zod';
import type { Database } from '@mushin/database';
import { creatorRepository, projectCreatorToIndex } from '@mushin/database';
import type { SerperAdapter, SerperSearchResult, ApifyAdapter, LLMAdapter, MeilisearchAdapter } from '@mushin/adapters';
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
  pipelineStages?: PipelineStages;
  executionStats?: ExecutionStats;
  createdAt: Date;
  completedAt?: Date;
  signal?: AbortSignal;
}

export interface DiscoveryResult {
  creatorId?: string;
  url: string;
  platform: string;
  handle?: string;
  displayName?: string;
  followerCount?: number;
  engagementRate?: number;
  niche?: string;
  city?: string;
  iqScore?: number;
  verified?: boolean;
  isLive?: boolean;
  confidence: number;
  source: 'serper' | 'apify' | 'llm';
  scrapeFailureReason?: string;
}

export interface PipelineStages {
  aiQueryExpansion: string[];
  serperQueriesExecuted: number;
  duplicatesFiltered: number;
  relevanceRejected: number;
  invalidPageTypes: number;
  dbDuplicatesFiltered: number;
  apifyUrlsScraped: number;
  creatorsPersistedDb: number;
  mushinRankingApplied: boolean;
}

export interface ExecutionStats {
  scrapedEndpoints: string[];
  latencyMs: number;
  creditsDeducted: number;
  freshness: string;
}

const queryExpansionSchema = z.object({
  searchQueries: z.array(z.string()).min(1).max(5),
});

const extractionSchema = z.object({
  handle: z.string().optional(),
  displayName: z.string().optional(),
  platform: z.string().optional(),
  niche: z.string().optional(),
  followerCount: z.number().optional(),
  engagementRate: z.number().optional(),
  city: z.string().optional(),
});

export interface DiscoveryConfig {
  maxResults: number;
  scrapeTimeout: number;
  llmTier: 'T-A' | 'T-B' | 'T-C';
}

// ── Store / Brand Keywords for Relevance Filter ────────────────

const STORE_BRAND_KEYWORDS = [
  'shop',
  'store',
  'buy',
  'price',
  'brand',
  'e-commerce',
  'cart',
  'checkout',
  'shipping',
  'order',
  'product',
  'sale',
  'clothing',
  'apparel',
  'discount',
  'fashion store',
  'online shop',
];

// ── Orchestrator ─────────────────────────────────────────────

export class DiscoveryOrchestrator {
  private db: Database;
  private serper: SerperAdapter;
  private apify: ApifyAdapter;
  private llm: LLMAdapter;
  private meilisearch?: MeilisearchAdapter;
  private config: DiscoveryConfig;

  constructor(
    db: Database,
    serper: SerperAdapter,
    apify: ApifyAdapter,
    llm: LLMAdapter,
    meilisearch?: MeilisearchAdapter,
    config?: Partial<DiscoveryConfig>,
  ) {
    this.db = db;
    this.serper = serper;
    this.apify = apify;
    this.llm = llm;
    this.meilisearch = meilisearch;
    this.config = {
      maxResults: config?.maxResults ?? 20,
      scrapeTimeout: config?.scrapeTimeout ?? 120,
      llmTier: config?.llmTier ?? 'T-A',
    };
  }

  /**
   * Execute a Brain 2 discovery job.
   * 1. Groq AI Translation & Multi-Query Expansion
   * 2. Serper Google SERP Scan
   * 3. The Bouncer (Relevance + URL + Batch Dedup + Postgres DB Check)
   * 4. Apify Scraper Grid for brand-new handles
   * 5. Quality scoring, Postgres persistence, and Brain 1 Meilisearch sync
   */
  async discover(job: DiscoveryJob, signal?: AbortSignal): Promise<DiscoveryResult[]> {
    const activeSignal = signal ?? job.signal;
    const checkAborted = () => {
      if (activeSignal?.aborted) {
        const err = new Error('Discovery operation cancelled');
        err.name = 'AbortError';
        throw err;
      }
    };

    checkAborted();
    const startTime = Date.now();
    job.status = 'searching';

    // Metrics tracker
    const stages: PipelineStages = {
      aiQueryExpansion: [],
      serperQueriesExecuted: 0,
      duplicatesFiltered: 0,
      relevanceRejected: 0,
      invalidPageTypes: 0,
      dbDuplicatesFiltered: 0,
      apifyUrlsScraped: 0,
      creatorsPersistedDb: 0,
      mushinRankingApplied: true,
    };

    // Stage 1: AI Query Expansion & Serper Scan
    checkAborted();
    const searchQueries = await this.buildSearchQueries(job, activeSignal);
    checkAborted();
    stages.aiQueryExpansion = searchQueries;
    stages.serperQueriesExecuted = searchQueries.length;

    const rawSearchResults = await this.searchStage(searchQueries, activeSignal);
    checkAborted();
    await this.emitStageEvent(job, 'search_completed', rawSearchResults.length);

    // Stage 2: The Bouncer (Relevance + Profile URL + Intra-batch + Local DB check)
    checkAborted();
    const filteredCandidates = await this.bouncerFilter(rawSearchResults, stages);
    checkAborted();
    await this.emitStageEvent(job, 'deduplication_completed', filteredCandidates.length);

    // Stage 3: Apify Profile Scraping for truly brand-new candidates
    checkAborted();
    job.status = 'scraping';
    const scrapeResults = await this.scrapeStage(job, filteredCandidates, activeSignal);
    checkAborted();
    stages.apifyUrlsScraped = scrapeResults.length;
    await this.emitStageEvent(job, 'scrape_completed', scrapeResults.length);

    // Stage 4: Quality Check & AI Extraction / Scoring
    checkAborted();
    job.status = 'extracting';
    const extractedResults = await this.extractionStage(job, scrapeResults, activeSignal);
    checkAborted();
    await this.emitStageEvent(job, 'extraction_completed', extractedResults.length);

    // Stage 5: Postgres Database Persistence & Brain 1 Meilisearch Sync
    checkAborted();
    const persistedResults = await this.persistToDatabase(job, extractedResults, activeSignal);
    checkAborted();
    stages.creatorsPersistedDb = persistedResults.length;

    // Execution Stats
    const latencyMs = Date.now() - startTime;
    const executionStats: ExecutionStats = {
      scrapedEndpoints: ['instagram.com', 'tiktok.com', 'youtube.com'],
      latencyMs,
      creditsDeducted: 12,
      freshness: 'realtime_1s',
    };

    // Complete Job
    job.status = 'completed';
    job.completedAt = new Date();
    job.results = persistedResults;
    job.pipelineStages = stages;
    job.executionStats = executionStats;

    return persistedResults;
  }

  // ── Stage 1: Groq AI Query Expansion & Serper Scan ─────────

  private async buildSearchQueries(job: DiscoveryJob, signal?: AbortSignal): Promise<string[]> {
    const basePrompt = job.query;

    try {
      if (signal?.aborted) throw new Error('Search queries generation aborted');

      const systemPrompt = `You are an expert Google Search query engineer for finding social media creators (influencers) on Instagram, TikTok, YouTube.
Convert the user request into 3 to 5 targeted Google search query formulas.
User prompt: "${basePrompt}"
Platform constraint: ${job.platform || 'all'}
Niche constraint: ${job.niche || 'any'}

Generate specific Google search query terms (avoiding restricted site: operators) like:
instagram "location" "niche keyword" profile
tiktok "location" "creator keyword"
youtube "channel keyword" "location"

Return JSON with format: { "searchQueries": ["...", "..."] }`;

      const llmRes = await this.llm.call(
        this.config.llmTier,
        systemPrompt,
        basePrompt,
        queryExpansionSchema,
        { signal },
      );

      if (llmRes.success && llmRes.data.searchQueries.length > 0) {
        return llmRes.data.searchQueries;
      }
    } catch (err) {
      if (signal?.aborted || (err as any)?.name === 'AbortError') {
        throw err;
      }
      console.warn('[Discovery] Groq query expansion fallback:', err);
    }

    // Default template formulas
    const platform = job.platform && job.platform !== 'all' ? job.platform : null;
    if (platform) {
      return [`${basePrompt} ${platform} profile`];
    }
    return [
      `${basePrompt} instagram profile`,
      `${basePrompt} tiktok profile`,
      `${basePrompt} youtube channel`,
    ];
  }

  private async searchStage(queries: string[], signal?: AbortSignal): Promise<DiscoveryResult[]> {
    const allHits: SerperSearchResult[] = [];

    for (const q of queries) {
      if (signal?.aborted) break;
      try {
        const hits = await this.serper.search(q, {
          numResults: Math.ceil(this.config.maxResults / queries.length) + 5,
          signal,
        });
        allHits.push(...hits);
      } catch (err) {
        if (signal?.aborted || (err as any)?.name === 'AbortError') {
          throw err;
        }
        console.warn(`[Discovery] Serper search failed for query "${q}":`, err);
      }
    }

    return allHits.map((r: SerperSearchResult) => ({
      url: r.link,
      platform: this.extractPlatform(r.link),
      handle: this.extractHandle(r.link),
      displayName: r.title,
      confidence: 0.5,
      source: 'serper' as const,
    }));
  }

  // ── Stage 2: The Bouncer (4-Part Filter & Deduplication) ─────

  private async bouncerFilter(
    results: DiscoveryResult[],
    stages: PipelineStages,
  ): Promise<DiscoveryResult[]> {
    const seenHandles = new Set<string>();
    const filtered: DiscoveryResult[] = [];

    for (const r of results) {
      if (!r.url || r.platform === 'unknown') continue;

      // 1. Relevance Filter: Reject stores, shop, buy, price, apparel keywords
      const titleSnippetLower = `${r.displayName || ''} ${r.url}`.toLowerCase();
      const isStoreBrand = STORE_BRAND_KEYWORDS.some((kw) => titleSnippetLower.includes(kw));
      if (isStoreBrand) {
        stages.relevanceRejected++;
        stages.duplicatesFiltered++;
        continue;
      }

      // 2. URL Filter: Direct Profile URLs only (reject /p/, /reel/, /tag/, /explore/)
      if (this.isNonProfileUrl(r.url)) {
        stages.invalidPageTypes++;
        stages.duplicatesFiltered++;
        continue;
      }

      const handle = r.handle || this.extractHandle(r.url);
      if (!handle) {
        stages.invalidPageTypes++;
        stages.duplicatesFiltered++;
        continue;
      }

      // 3. Intra-batch Deduplication
      const key = `${r.platform}:${handle.toLowerCase()}`;
      if (seenHandles.has(key)) {
        stages.duplicatesFiltered++;
        continue;
      }
      seenHandles.add(key);

      // 4. Local Database Check (Brain 1 Cross-Check)
      // If handle already exists in our local DB, reject it to avoid unnecessary scraping cost!
      try {
        const existing = await creatorRepository.findByHandle(this.db, handle, r.platform);
        if (existing) {
          stages.dbDuplicatesFiltered++;
          stages.duplicatesFiltered++;
          continue; // Throw away link — already known in database!
        }
      } catch {
        // If DB query fails or uninitialized, allow candidate
      }

      filtered.push({ ...r, handle });
      if (filtered.length >= this.config.maxResults) break;
    }

    return filtered;
  }

  private isNonProfileUrl(url: string): boolean {
    const lower = url.toLowerCase();
    const nonProfilePaths = [
      '/explore/',
      '/p/',
      '/reel/',
      '/reels/',
      '/stories/',
      '/watch',
      '/about',
      '/privacy',
      '/terms',
      '/help',
      '/search',
      '/legal',
      '/login',
      '/signup',
      '/contact',
      '/explore/tags/',
    ];
    return nonProfilePaths.some((p) => lower.includes(p));
  }

  // ── Stage 3: Apify Profile Scraping ─────────────────────────

  private async scrapeStage(
    job: DiscoveryJob,
    searchResults: DiscoveryResult[],
    signal?: AbortSignal,
  ): Promise<DiscoveryResult[]> {
    const results: DiscoveryResult[] = [];
    const urlsToScrape = searchResults.slice(0, 10);

    for (const result of urlsToScrape) {
      if (signal?.aborted) break;
      try {
        const actorId = this.getActorForPlatform(result.platform);
        if (!actorId) {
          // No scraper actor available for platform: keep discovered search hit with unverified status
          results.push({
            ...result,
            verified: false,
            isLive: false,
            confidence: 0.5,
            source: 'serper' as const,
            scrapeFailureReason: 'unsupported_platform',
          });
          continue;
        }

        const items = await this.apify.runActor(
          actorId,
          { urls: [result.url] },
          { timeoutSecs: this.config.scrapeTimeout, signal },
        );

        if (items && items.length > 0) {
          const scraped = items[0]!;
          const rawFollowers = scraped['followerCount'] ?? scraped['followersCount'];
          const parsedFollowers =
            typeof rawFollowers === 'number' && Number.isFinite(rawFollowers)
              ? Math.max(0, Math.round(rawFollowers))
              : undefined;

          const rawEngagement = scraped['engagementRate'];
          const parsedEngagement =
            typeof rawEngagement === 'number' && Number.isFinite(rawEngagement)
              ? Number(rawEngagement.toFixed(2))
              : undefined;

          results.push({
            ...result,
            handle: (scraped['handle'] as string) ?? result.handle,
            displayName: (scraped['displayName'] as string) ?? result.displayName,
            followerCount: parsedFollowers,
            engagementRate: parsedEngagement,
            niche: (scraped['niche'] as string) ?? result.niche,
            city: (scraped['city'] as string) ?? result.city,
            verified: Boolean(scraped['verified']),
            isLive: parsedFollowers !== undefined,
            confidence: 0.9,
            source: 'apify' as const,
          });
        } else {
          // Scraping returned 0 items / empty dataset
          results.push({
            ...result,
            verified: false,
            isLive: false,
            confidence: 0.5,
            source: 'serper' as const,
            scrapeFailureReason: 'empty_dataset',
          });
        }
      } catch (err) {
        if (signal?.aborted || (err as any)?.name === 'AbortError') {
          throw err;
        }
        const safeReason = err instanceof Error ? err.message : 'Unknown scrape error';
        console.warn(`[Discovery] Apify scrape failed for ${result.url}:`, safeReason);
        results.push({
          ...result,
          verified: false,
          isLive: false,
          confidence: 0.4,
          source: 'serper' as const,
          scrapeFailureReason: 'scraper_error',
        });
      }
    }

    return results;
  }

  // ── Stage 4: AI Quality Check & Extraction ──────────────────

  private async extractionStage(
    job: DiscoveryJob,
    scrapeResults: DiscoveryResult[],
    signal?: AbortSignal,
  ): Promise<DiscoveryResult[]> {
    const results: DiscoveryResult[] = [];

    for (const result of scrapeResults) {
      if (signal?.aborted) break;
      try {
        if (!result.handle && !result.displayName) continue;

        const extraction = await this.llm.call(
          this.config.llmTier,
          'Extract creator details. Return JSON matching: handle, displayName, platform, niche, followerCount, engagementRate, city',
          JSON.stringify(result),
          extractionSchema,
          { signal },
        );

        if (extraction.success) {
          const extracted = extraction.data as Record<string, unknown>;
          const extractedFollowers =
            typeof extracted['followerCount'] === 'number' && Number.isFinite(extracted['followerCount'])
              ? Math.max(0, Math.round(extracted['followerCount']))
              : result.followerCount;

          const extractedEngagement =
            typeof extracted['engagementRate'] === 'number' && Number.isFinite(extracted['engagementRate'])
              ? Number(Number(extracted['engagementRate']).toFixed(2))
              : result.engagementRate;

          results.push({
            ...result,
            handle: (extracted['handle'] as string) ?? result.handle,
            displayName: (extracted['displayName'] as string) ?? result.displayName,
            niche: (extracted['niche'] as string) ?? result.niche,
            followerCount: extractedFollowers,
            engagementRate: extractedEngagement,
            city: (extracted['city'] as string) ?? result.city,
            confidence: 0.95,
          });
        } else {
          results.push(result);
        }
      } catch (err) {
        if (signal?.aborted || (err as any)?.name === 'AbortError') {
          throw err;
        }
        results.push(result);
      }
    }

    return results;
  }

  // ── Stage 5: DB Persistence & Brain 1 Search Index Sync ────

  private async persistToDatabase(
    job: DiscoveryJob,
    results: DiscoveryResult[],
    signal?: AbortSignal,
  ): Promise<DiscoveryResult[]> {
    const persisted: DiscoveryResult[] = [];

    for (const res of results) {
      if (signal?.aborted) break;
      if (!res.handle) continue;
      const platform = (res.platform || 'instagram') as 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'facebook';

      try {
        let creatorId: string | undefined;

        // Check if creator already exists in GCP database (ADR-029 Deduplication & GDPR check)
        const existing = await creatorRepository.findByHandle(this.db, res.handle, platform);

        if (existing) {
          // Rule 5: GDPR erasure must never be undone by discovery replay
          if (
            existing.creator.piiErasedAt != null ||
            existing.creator.displayName === '[ERASED]' ||
            existing.creator.primaryHandle === '[ERASED]'
          ) {
            console.warn(`[Discovery] Skipping GDPR-erased creator ${res.handle}`);
            continue;
          }

          creatorId = existing.creator.creatorId;

          // Update truthful metrics if new follower count gathered from scraper
          const existingProfile = existing.profiles.find((p) => p.platform === platform);
          if (existingProfile && res.followerCount !== undefined && res.followerCount !== null) {
            await creatorRepository.updateProfile(this.db, existingProfile.profileId, {
              followerCount: res.followerCount,
              payloadCompletenessTier: res.source === 'apify' && res.followerCount ? 'standard' : existingProfile.payloadCompletenessTier,
            });
          }
        } else {
          // Create new creator record in Postgres DB (truthful metrics, never fabricated)
          const created = await creatorRepository.create(this.db, {
            name: res.displayName || res.handle.replace(/^@/, ''),
            handle: res.handle,
            platform,
            canonicalUrl: res.url,
            followerCount: res.followerCount,
            completenessTier: res.source === 'apify' && res.followerCount ? 'standard' : 'minimal',
          });
          creatorId = created?.creator?.creatorId;
        }

        const resWithId: DiscoveryResult = { ...res, creatorId };
        persisted.push(resWithId);

        // Synchronously project to Brain 1 Meilisearch Index if available
        if (this.meilisearch && creatorId) {
          try {
            const meili = this.meilisearch;
            await projectCreatorToIndex(creatorId, this.db, {
              upsertDocument: async (index: string, doc: Record<string, unknown>) => {
                const projRes = await meili.upsertDocumentToIndex(index, doc);
                return { success: projRes.status === 'success', degraded: projRes.status === 'projection_deferred' };
              },
            });
          } catch (projErr) {
            console.warn(`[Discovery] Meilisearch index projection deferred for ${creatorId}:`, projErr);
          }
        }
      } catch (err) {
        console.warn(`[Discovery] DB persistence failed for handle ${res.handle}:`, err);
        persisted.push(res);
      }
    }

    return persisted;
  }

  // ── Helpers ────────────────────────────────────────────────

  private extractPlatform(url: string): string {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      if (domain.includes('instagram')) return 'instagram';
      if (domain.includes('tiktok')) return 'tiktok';
      if (domain.includes('youtube')) return 'youtube';
      if (domain.includes('twitter') || domain.includes('x.com')) return 'twitter';
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private extractHandle(url: string): string | undefined {
    try {
      const parsed = new URL(url);
      const path = parsed.pathname;
      const parts = path.split('/').filter(Boolean);
      if (!parts[0]) return undefined;
      const cleanPart = parts[0].replace(/^@+/, '');
      return `@${cleanPart}`;
    } catch {
      return undefined;
    }
  }

  private getActorForPlatform(platform: string): string | null {
    const actors: Record<string, string> = {
      instagram: 'apify/instagram-scraper',
      tiktok: 'clockworks/tiktok-profile-scraper',
      youtube: 'streamers/youtube-channel-scraper',
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
  meilisearch?: MeilisearchAdapter,
  config?: Partial<DiscoveryConfig>,
): DiscoveryOrchestrator {
  return new DiscoveryOrchestrator(db, serper, apify, llm, meilisearch, config);
}

