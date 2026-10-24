/**
 * Filtered Search Route Tests (Step 2C: Brain 1 Search & Index — Fix F-04).
 *
 * Verifies HTTP API contracts for /api/v1/creators/search:
 * 1. Keyword search using ?q=ayesha
 * 2. Keyword search using ?query=ayesha
 * 3. Precedence behavior when both ?q and ?query are supplied
 * 4. Query trimming and maximum length validation
 * 5. Multi-criteria filtering (AND-composition)
 * 6. No-filter searches (omitting filter option entirely)
 * 7. Page, limit, and offset calculation
 * 8. Accurate pagination totals (totalHits > page hits, estimatedTotalHits)
 * 9. Empty search results
 * 10. Meilisearch unavailable (503 ADAPTER_DEGRADED) and degraded (200 degraded: true) contracts
 * 11. Erased / tombstoned creators are not exposed or reintroduced
 * 12. Invalid query and filter parameter validation (400 VALIDATION_ERROR)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import type { TenancyContext } from '@mushin/shared';
import type { MeilisearchAdapter, SearchResult } from '@mushin/adapters';
import { createSearchRoutes } from '../routes/m3-search/filtered-search.js';

describe('Filtered Search Routes (/api/v1/creators/search)', () => {
  let app: Hono;
  let mockSearch: ReturnType<typeof vi.fn>;
  let mockMeilisearch: Partial<MeilisearchAdapter>;

  const createSampleHit = (overrides: Record<string, unknown> = {}) => ({
    creatorId: 'crt-test-001',
    id: 'crt-test-001',
    displayName: 'Ayesha Khan',
    primaryHandle: '@ayeshakhan',
    platform: 'youtube',
    followerCount: 250000,
    engagementRate: 0.045,
    primaryNiche: 'tech',
    secondaryNiches: ['gadgets'],
    authenticityBand: 'strong',
    authenticityScore: 92,
    qualityScore: 88,
    audiencePkShare: 0.75,
    audienceGccShare: 0.15,
    lastEnrichedAt: new Date().toISOString(),
    completenessTier: 'rich',
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch = vi.fn().mockResolvedValue({
      status: 'success',
      hits: [createSampleHit()],
      totalHits: 1,
      cost: {
        provider: 'meilisearch',
        operation: 'search',
        unitCostUsd: 0,
        timestamp: new Date().toISOString(),
      },
    } as SearchResult);

    mockMeilisearch = {
      search: mockSearch as any,
    };

    app = new Hono();

    app.use('*', async (c, next) => {
      c.set('requestId', 'req-search-test-123');
      const tenancy: TenancyContext = {
        userId: 'usr-tester-001',
        workspaceId: 'ws-test-456',
        creatorId: 'crt-tester-001',
        isStaff: false,
        roles: ['member'],
        claims: {
          iss: 'https://auth.mushin.app/',
          sub: 'usr-tester-001',
          aud: 'mushin-api',
          exp: 9999999999,
          iat: 1000000000,
        },
      };
      c.set('tenancy', tenancy);
      await next();
    });

    app.route('/api/v1/creators', createSearchRoutes(mockMeilisearch as MeilisearchAdapter));
  });

  // ── 1. Keyword search using ?q=ayesha ─────────────────────────────────────
  it('1. Keyword search using ?q=ayesha passes trimmed keyword to adapter', async () => {
    const res = await app.request('/api/v1/creators/search?q=ayesha');
    expect(res.status).toBe(200);

    const body = (await res.json()) as any;
    expect(body.data).toBeDefined();
    expect(body.data.length).toBe(1);
    expect(body.data[0].displayName).toBe('Ayesha Khan');
    expect(mockSearch).toHaveBeenCalledWith('ayesha', undefined, 20, 0);
  });

  // ── 2. Keyword search using ?query=ayesha ─────────────────────────────────
  it('2. Keyword search using ?query=ayesha passes keyword to adapter', async () => {
    const res = await app.request('/api/v1/creators/search?query=ayesha');
    expect(res.status).toBe(200);

    const body = (await res.json()) as any;
    expect(body.data).toBeDefined();
    expect(body.data.length).toBe(1);
    expect(mockSearch).toHaveBeenCalledWith('ayesha', undefined, 20, 0);
  });

  // ── 3. Behavior when both ?q and ?query are supplied ─────────────────────
  it('3. Precedence: canonical ?q takes precedence over ?query when both are provided', async () => {
    const res = await app.request('/api/v1/creators/search?q=canonical_q&query=ignored_query');
    expect(res.status).toBe(200);

    // Canonical parameter ?q takes precedence
    expect(mockSearch).toHaveBeenCalledWith('canonical_q', undefined, 20, 0);
  });

  // ── 4. Query trimming and maximum-length validation ──────────────────────
  it('4. Query trimming and maximum length validation', async () => {
    // 4a: Leading and trailing whitespace is trimmed
    const resTrim = await app.request('/api/v1/creators/search?q=%20%20ayesha%20%20');
    expect(resTrim.status).toBe(200);
    expect(mockSearch).toHaveBeenCalledWith('ayesha', undefined, 20, 0);

    // 4b: Query exceeding 500 characters is rejected with VALIDATION_ERROR
    const longQuery = 'a'.repeat(501);
    const resTooLongQ = await app.request(`/api/v1/creators/search?q=${longQuery}`);
    expect(resTooLongQ.status).toBe(400);

    const errorBodyQ = (await resTooLongQ.json()) as any;
    expect(errorBodyQ.error).toBeDefined();
    expect(errorBodyQ.error.code).toBe('VALIDATION_ERROR');
    expect(errorBodyQ.error.message).toBe('Invalid search parameters');
    expect(errorBodyQ.error.request_id).toBe('req-search-test-123');

    // 4c: ?query exceeding 500 characters is also rejected
    const resTooLongQuery = await app.request(`/api/v1/creators/search?query=${longQuery}`);
    expect(resTooLongQuery.status).toBe(400);
    const errorBodyQuery = (await resTooLongQuery.json()) as any;
    expect(errorBodyQuery.error.code).toBe('VALIDATION_ERROR');
  });

  // ── 5. Multi-criteria filtering ──────────────────────────────────────────
  it('5. Multi-criteria filtering joins expressions with AND semantics', async () => {
    const res = await app.request(
      '/api/v1/creators/search?platform=youtube&niche=tech&follower_min=10000&follower_max=500000&authenticity_band=strong',
    );
    expect(res.status).toBe(200);

    expect(mockSearch).toHaveBeenCalledTimes(1);
    const [queryArg, filterArg] = mockSearch.mock.calls[0]!;
    expect(queryArg).toBe('');
    expect(filterArg).toBe(
      'platform = "youtube" AND followerCount >= 10000 AND followerCount <= 500000 AND primaryNiche = "tech" AND authenticityBand = "strong"',
    );
  });

  // ── 6. No-filter searches ────────────────────────────────────────────────
  it('6. No-filter searches omit filter option entirely (never send empty expression or [""])', async () => {
    const res = await app.request('/api/v1/creators/search');
    expect(res.status).toBe(200);

    expect(mockSearch).toHaveBeenCalledWith('', undefined, 20, 0);
    const filterArg = mockSearch.mock.calls[0]![1];
    expect(filterArg).toBeUndefined();
  });

  // ── 7. Correct page and limit handling ───────────────────────────────────
  it('7. Page, limit, and offset calculation', async () => {
    const res = await app.request('/api/v1/creators/search?page=3&limit=15');
    expect(res.status).toBe(200);

    // Offset for page 3 with limit 15: (3 - 1) * 15 = 30
    expect(mockSearch).toHaveBeenCalledWith('', undefined, 15, 30);

    const body = (await res.json()) as any;
    expect(body.page).toBe(3);
    expect(body.limit).toBe(15);
  });

  // ── 8. Global total greater than the number of returned page results ─────
  it('8. Global total reflects verified Meilisearch totalHits greater than returned page slice', async () => {
    const hit1 = createSampleHit({ creatorId: 'crt-001', displayName: 'Creator 1' });
    const hit2 = createSampleHit({ creatorId: 'crt-002', displayName: 'Creator 2' });

    // Meilisearch returns 2 hits for page, but total matching count is 350
    mockSearch.mockResolvedValueOnce({
      status: 'success',
      hits: [hit1, hit2],
      totalHits: 350,
      cost: {
        provider: 'meilisearch',
        operation: 'search',
        unitCostUsd: 0,
        timestamp: new Date().toISOString(),
      },
    } as SearchResult);

    const res = await app.request('/api/v1/creators/search?page=1&limit=2');
    expect(res.status).toBe(200);

    const body = (await res.json()) as any;
    expect(body.data.length).toBe(2);
    expect(body.total).toBe(350); // Global total preserved, NOT current page length (2)
    expect(body.meta.total_precision).toBe('exact');
    expect(body.page).toBe(1);
    expect(body.limit).toBe(2);
  });

  it('8b. Estimated total hits is supported when exhaustive totalHits is not provided', async () => {
    const hit1 = createSampleHit({ creatorId: 'crt-001' });

    mockSearch.mockResolvedValueOnce({
      status: 'success',
      hits: [hit1],
      estimatedTotalHits: 120,
      cost: {
        provider: 'meilisearch',
        operation: 'search',
        unitCostUsd: 0,
        timestamp: new Date().toISOString(),
      },
    } as SearchResult);

    const res = await app.request('/api/v1/creators/search?page=1&limit=20');
    expect(res.status).toBe(200);

    const body = (await res.json()) as any;
    expect(body.total).toBe(120);
    expect(body.meta.total_precision).toBe('estimated');
  });

  it('8c. Documented fallback total is exact on page 1 when hits are fewer than limit', async () => {
    const hit1 = createSampleHit({ creatorId: 'crt-001' });

    // Simulate response with neither total field provided
    mockSearch.mockResolvedValueOnce({
      status: 'success',
      hits: [hit1],
      cost: {
        provider: 'meilisearch',
        operation: 'search',
        unitCostUsd: 0,
        timestamp: new Date().toISOString(),
      },
    } as SearchResult);

    const res = await app.request('/api/v1/creators/search?page=1&limit=20');
    expect(res.status).toBe(200);

    const body = (await res.json()) as any;
    // Page 1 with fewer hits than limit (1 < 20) is known to be the exact total
    expect(body.total).toBe(1);
    expect(body.meta.total_precision).toBe('exact');
  });

  it('8d. Later page where total is unavailable clearly returns lower_bound semantics in meta', async () => {
    const hits = Array.from({ length: 15 }, (_, i) =>
      createSampleHit({ creatorId: `crt-page2-${i}`, displayName: `Creator Page2 ${i}` }),
    );

    // Meilisearch returns page 2 hits with neither totalHits nor estimatedTotalHits
    mockSearch.mockResolvedValueOnce({
      status: 'success',
      hits,
      cost: {
        provider: 'meilisearch',
        operation: 'search',
        unitCostUsd: 0,
        timestamp: new Date().toISOString(),
      },
    } as SearchResult);

    const res = await app.request('/api/v1/creators/search?page=2&limit=20');
    expect(res.status).toBe(200);

    const body = (await res.json()) as any;
    // Offset is 20, ranked.length is 15 -> lower bound is 35
    expect(body.total).toBe(35);
    expect(body.meta.total_precision).toBe('lower_bound');
    expect(body.meta.is_lower_bound).toBe(true);
    expect(body.page).toBe(2);
    expect(body.limit).toBe(20);
  });

  // ── 9. Empty search results ──────────────────────────────────────────────
  it('9. Empty search results return 200 with data: [] and total: 0', async () => {
    mockSearch.mockResolvedValueOnce({
      status: 'success',
      hits: [],
      totalHits: 0,
      cost: {
        provider: 'meilisearch',
        operation: 'search',
        unitCostUsd: 0,
        timestamp: new Date().toISOString(),
      },
    } as SearchResult);

    const res = await app.request('/api/v1/creators/search?q=nonexistent_creator_xyz');
    expect(res.status).toBe(200);

    const body = (await res.json()) as any;
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(20);
    expect(body.meta.request_id).toBe('req-search-test-123');
  });

  // ── 10. Meilisearch unavailable or degraded behavior ─────────────────────
  it('10a. Meilisearch unavailable returns 503 ADAPTER_DEGRADED', async () => {
    mockSearch.mockResolvedValueOnce({
      status: 'error',
      error: 'Connection refused',
    } as SearchResult);

    const res = await app.request('/api/v1/creators/search');
    expect(res.status).toBe(503);

    const body = (await res.json()) as any;
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('ADAPTER_DEGRADED');
    expect(body.error.message).toBe('Search index unavailable');
    expect(body.error.request_id).toBe('req-search-test-123');
  });

  it('10b. Meilisearch circuit breaker open returns 200 with degraded: true meta', async () => {
    mockSearch.mockResolvedValueOnce({
      status: 'degraded',
      hits: [],
      reason: 'Circuit breaker open',
    } as SearchResult);

    const res = await app.request('/api/v1/creators/search');
    expect(res.status).toBe(200);

    const body = (await res.json()) as any;
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
    expect(body.meta.degraded).toBe(true);
    expect(body.meta.reason).toBe('Circuit breaker open');
    expect(body.meta.request_id).toBe('req-search-test-123');
  });

  // ── 11. Erased / tombstoned creators are not exposed or reintroduced ──────
  // Note: CreatorIndexDocument is a public-data-only projection and does NOT contain piiErasedAt.
  // The authoritative GDPR safeguard is the Step 2B deletion/outbox synchronization flow
  // (CREATOR_ERASED event -> worker -> meilisearch.deleteDocument) and projection guards in M2/M5.
  // The search route provides an in-memory defense-in-depth guard that drops any tombstoned
  // document where displayName or primaryHandle equals '[ERASED]'.
  it('11. Tombstoned creators ([ERASED] markers) are filtered out and never exposed in results', async () => {
    const activeHit = createSampleHit({
      creatorId: 'crt-active-001',
      displayName: 'Active Creator',
      primaryHandle: '@active_creator',
    });
    const erasedHitByName = createSampleHit({
      creatorId: 'crt-erased-002',
      displayName: '[ERASED]',
      primaryHandle: '@active_creator',
    });
    const erasedHitByHandle = createSampleHit({
      creatorId: 'crt-erased-003',
      displayName: 'Some Name',
      primaryHandle: '[ERASED]',
    });

    mockSearch.mockResolvedValueOnce({
      status: 'success',
      hits: [activeHit, erasedHitByName, erasedHitByHandle],
      totalHits: 3,
      cost: {
        provider: 'meilisearch',
        operation: 'search',
        unitCostUsd: 0,
        timestamp: new Date().toISOString(),
      },
    } as SearchResult);

    const res = await app.request('/api/v1/creators/search');
    expect(res.status).toBe(200);

    const body = (await res.json()) as any;
    // Only the active creator should be returned
    expect(body.data.length).toBe(1);
    expect(body.data[0].creatorId).toBe('crt-active-001');
    expect(body.data[0].displayName).toBe('Active Creator');

    // Confirm no tombstoned records were exposed
    const displayNames = body.data.map((d: any) => d.displayName);
    expect(displayNames).not.toContain('[ERASED]');
    const handles = body.data.map((d: any) => d.primaryHandle);
    expect(handles).not.toContain('[ERASED]');
  });

  // ── 12. Invalid query and filter parameters return 400 VALIDATION_ERROR ───
  it('12a. Negative follower_min returns 400 VALIDATION_ERROR', async () => {
    const res = await app.request('/api/v1/creators/search?follower_min=-50');
    expect(res.status).toBe(400);

    const body = (await res.json()) as any;
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('Invalid search parameters');
  });

  it('12b. Invalid platform returns 400 VALIDATION_ERROR', async () => {
    const res = await app.request('/api/v1/creators/search?platform=myspace');
    expect(res.status).toBe(400);

    const body = (await res.json()) as any;
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('12c. Engagement rate > 1 returns 400 VALIDATION_ERROR', async () => {
    const res = await app.request('/api/v1/creators/search?engagement_rate_min=1.5');
    expect(res.status).toBe(400);

    const body = (await res.json()) as any;
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('12d. Invalid city filter with injection characters returns 400 VALIDATION_ERROR', async () => {
    const res = await app.request('/api/v1/creators/search?audience_city=Karachi"%20OR%201=1');
    expect(res.status).toBe(400);

    const body = (await res.json()) as any;
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('12e. Invalid page number (0 or negative) returns 400 VALIDATION_ERROR', async () => {
    const res = await app.request('/api/v1/creators/search?page=0');
    expect(res.status).toBe(400);

    const body = (await res.json()) as any;
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
