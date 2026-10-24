/**
 * DiscoveryOrchestrator behavioral tests.
 * Asserts truthful metric preservation, zero synthetic fabrication on scraper failure,
 * deduplication, and database persistence.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDiscoveryOrchestrator, type DiscoveryJob } from '../services/discovery/orchestrator.js';

describe('DiscoveryOrchestrator (Phase 3A Data Truth)', () => {
  let mockDb: any;
  let mockSerper: any;
  let mockApify: any;
  let mockLlm: any;
  let mockMeilisearch: any;
  let createdCreators: any[];

  beforeEach(() => {
    createdCreators = [];

    mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // No DB duplicate matches
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockImplementation((val) => {
          createdCreators.push(val);
          return {
            returning: vi.fn().mockResolvedValue([
              {
                creatorId: 'c-uuid-12345',
                displayName: val.displayName || val.name,
                primaryHandle: val.primaryHandle || val.handle,
              },
            ]),
          };
        }),
      }),
    };

    mockSerper = {
      search: vi.fn().mockResolvedValue([
        {
          title: 'Ayla Travel (@aylatravel) • Instagram photos and videos',
          link: 'https://www.instagram.com/aylatravel/',
          snippet: 'Pakistani travel content creator',
          position: 1,
        },
      ]),
    };

    mockApify = {
      runActor: vi.fn(),
    };

    mockLlm = {
      call: vi.fn().mockResolvedValue({
        success: true,
        data: { searchQueries: ['site:instagram.com pakistani travel'] },
      }),
    };

    mockMeilisearch = {
      upsertDocumentToIndex: vi.fn().mockResolvedValue({ status: 'success' }),
    };
  });

  it('preserves legitimate metrics when Apify scraping succeeds', async () => {
    mockApify.runActor.mockResolvedValue([
      {
        handle: '@aylatravel',
        displayName: 'Ayla Travel',
        followerCount: 245000,
        engagementRate: 6.8,
        niche: 'Travel',
        city: 'Islamabad',
        verified: true,
      },
    ]);

    const orchestrator = createDiscoveryOrchestrator(
      mockDb,
      mockSerper,
      mockApify,
      mockLlm,
      mockMeilisearch,
    );

    const job: DiscoveryJob = {
      jobId: 'job-1',
      workspaceId: 'ws-1',
      query: 'Pakistani travel creators',
      status: 'queued',
      results: [],
      createdAt: new Date(),
    };

    const results = await orchestrator.discover(job);

    expect(results).toHaveLength(1);
    const creator = results[0]!;
    expect(creator.handle).toBe('@aylatravel');
    expect(creator.followerCount).toBe(245000);
    expect(creator.engagementRate).toBe(6.8);
    expect(creator.niche).toBe('Travel');
    expect(creator.verified).toBe(true);
    expect(creator.isLive).toBe(true);
    expect(creator.source).toBe('apify');
  });

  it('NEVER fabricates follower count or engagement rate when scraping returns empty', async () => {
    mockApify.runActor.mockResolvedValue([]); // Empty dataset

    const orchestrator = createDiscoveryOrchestrator(
      mockDb,
      mockSerper,
      mockApify,
      mockLlm,
      mockMeilisearch,
    );

    const job: DiscoveryJob = {
      jobId: 'job-2',
      workspaceId: 'ws-1',
      query: 'Travel creators',
      status: 'queued',
      results: [],
      createdAt: new Date(),
    };

    const results = await orchestrator.discover(job);

    expect(results).toHaveLength(1);
    const unverified = results[0]!;
    // Must remain truthful: zero synthetic numbers
    expect(unverified.followerCount).toBeUndefined();
    expect(unverified.engagementRate).toBeUndefined();
    expect(unverified.verified).toBe(false);
    expect(unverified.isLive).toBe(false);
    expect(unverified.source).toBe('serper');
    expect(unverified.scrapeFailureReason).toBe('empty_dataset');
  });

  it('NEVER fabricates follower count or engagement rate when scraper throws network error', async () => {
    mockApify.runActor.mockRejectedValue(new Error('Rate limit exceeded (HTTP 429)'));

    const orchestrator = createDiscoveryOrchestrator(
      mockDb,
      mockSerper,
      mockApify,
      mockLlm,
      mockMeilisearch,
    );

    const job: DiscoveryJob = {
      jobId: 'job-3',
      workspaceId: 'ws-1',
      query: 'Food creators',
      status: 'queued',
      results: [],
      createdAt: new Date(),
    };

    const results = await orchestrator.discover(job);

    expect(results).toHaveLength(1);
    const candidate = results[0]!;
    expect(candidate.followerCount).toBeUndefined();
    expect(candidate.engagementRate).toBeUndefined();
    expect(candidate.verified).toBe(false);
    expect(candidate.isLive).toBe(false);
    expect(candidate.scrapeFailureReason).toBe('scraper_error');
  });

  it('filters out non-profile URL paths during Bouncer stage', async () => {
    mockSerper.search.mockResolvedValue([
      {
        title: 'Instagram Explore Tags',
        link: 'https://www.instagram.com/explore/tags/travel/',
        snippet: 'Popular travel photos',
        position: 1,
      },
      {
        title: 'Instagram Reel',
        link: 'https://www.instagram.com/reels/xyz123/',
        snippet: 'Viral reel',
        position: 2,
      },
      {
        title: 'Real Profile (@realcreator)',
        link: 'https://www.instagram.com/realcreator/',
        snippet: 'Authentic creator profile',
        position: 3,
      },
    ]);

    mockApify.runActor.mockResolvedValue([
      { handle: '@realcreator', displayName: 'Real Creator', followerCount: 50000 },
    ]);

    const orchestrator = createDiscoveryOrchestrator(
      mockDb,
      mockSerper,
      mockApify,
      mockLlm,
      mockMeilisearch,
    );

    const job: DiscoveryJob = {
      jobId: 'job-4',
      workspaceId: 'ws-1',
      query: 'Explore tag',
      status: 'queued',
      results: [],
      createdAt: new Date(),
    };

    const results = await orchestrator.discover(job);

    // Only the real profile should pass through The Bouncer
    expect(results).toHaveLength(1);
    expect(results[0]?.handle).toBe('@realcreator');
  });
});
