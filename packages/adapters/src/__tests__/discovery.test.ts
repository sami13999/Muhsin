/**
 * Discovery pipeline unit tests.
 * Tests Serper adapter, Apify adapter, and discovery provider interfaces.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SerperAdapter, createSerperAdapter } from '../serper/adapter.js';
import { ApifyAdapter, createApifyAdapter, _resetCircuitForTesting } from '../apify/adapter.js';

describe('SerperAdapter', () => {
  const originalFetch = globalThis.fetch;
  let adapter: SerperAdapter;

  beforeEach(() => {
    vi.restoreAllMocks();
    adapter = createSerperAdapter({ apiKey: 'test-serper-key' });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('formats Google SERP query correctly and parses organic results', async () => {
    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: any = null;

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init: any) => {
      capturedUrl = url;
      capturedHeaders = init.headers;
      capturedBody = JSON.parse(init.body);

      return {
        ok: true,
        status: 200,
        json: async () => ({
          searchParameters: { q: 'site:instagram.com travel pakistani', type: 'search' },
          organic: [
            {
              title: 'Travel Creator (@travelpk) • Instagram',
              link: 'https://www.instagram.com/travelpk',
              snippet: 'Pakistani travel vlogger based in Lahore',
              position: 1,
            },
          ],
        }),
      } as Response;
    });

    const results = await adapter.search('site:instagram.com travel pakistani', { numResults: 5 });

    expect(capturedUrl).toBe('https://google.serper.dev/search');
    expect(capturedHeaders['X-API-KEY']).toBe('test-serper-key');
    expect(capturedHeaders['Content-Type']).toBe('application/json');
    expect(capturedBody.q).toBe('site:instagram.com travel pakistani');
    expect(capturedBody.num).toBe(5);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      title: 'Travel Creator (@travelpk) • Instagram',
      link: 'https://www.instagram.com/travelpk',
      snippet: 'Pakistani travel vlogger based in Lahore',
      position: 1,
    });
  });

  it('searches social profiles across specific platforms', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init: any) => {
      const body = JSON.parse(init.body);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          searchParameters: { q: body.q, type: 'search' },
          organic: [
            {
              title: 'Foodie (@foodiepk)',
              link: 'https://www.tiktok.com/@foodiepk',
              snippet: 'Food reviews in Karachi',
              position: 1,
            },
          ],
        }),
      } as Response;
    });

    const results = await adapter.searchSocialProfiles('foodie Karachi', 'tiktok');

    expect(results).toHaveLength(1);
    expect(results[0]?.link).toContain('tiktok.com/@foodiepk');
  });

  it('handles API errors without unhandled rejection', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: async () => 'Invalid API key',
    } as Response);

    await expect(adapter.search('query')).rejects.toThrow('Serper API error: 403');
  });

  it('honors AbortSignal and aborts immediately without retrying', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      adapter.search('site:instagram.com travel', { signal: controller.signal }),
    ).rejects.toThrow('Serper search aborted');
  });
});

describe('ApifyAdapter', () => {
  const originalFetch = globalThis.fetch;
  let adapter: ApifyAdapter;

  beforeEach(() => {
    vi.restoreAllMocks();
    _resetCircuitForTesting();
    adapter = createApifyAdapter({ apiKey: 'test-apify-token' });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('runs actor with input and fetches dataset items', async () => {
    let actorRunPayload: any = null;

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: any) => {
      if (url.includes('/runs?')) {
        actorRunPayload = JSON.parse(init.body);
        return {
          ok: true,
          status: 201,
          json: async () => ({
            data: {
              id: 'run_123',
              defaultDatasetId: 'ds_123',
              status: 'READY',
            },
          }),
        } as Response;
      }
      if (url.includes('/actor-runs/run_123')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              id: 'run_123',
              defaultDatasetId: 'ds_123',
              status: 'SUCCEEDED',
            },
          }),
        } as Response;
      }
      if (url.includes('/datasets/ds_123/items')) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              handle: '@shahveerjay',
              displayName: 'Shahveer Jafry',
              followerCount: 3400000,
              engagementRate: 9.4,
              verified: true,
            },
          ],
        } as Response;
      }
      return { ok: false, status: 404, text: async () => 'Not found' } as Response;
    });

    const items = await adapter.runActor(
      'apify/instagram-scraper',
      { urls: ['https://www.instagram.com/shahveerjay'] },
      { timeoutSecs: 30 },
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      handle: '@shahveerjay',
      displayName: 'Shahveer Jafry',
      followerCount: 3400000,
      engagementRate: 9.4,
      verified: true,
    });
    expect(actorRunPayload).toMatchObject({
      urls: ['https://www.instagram.com/shahveerjay'],
      timeoutSecs: 30,
    });
  });

  it('handles empty dataset results truthfully without error', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/runs?')) {
        return {
          ok: true,
          status: 201,
          json: async () => ({
            data: {
              id: 'run_empty',
              defaultDatasetId: 'ds_empty',
              status: 'READY',
            },
          }),
        } as Response;
      }
      if (url.includes('/actor-runs/run_empty')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              id: 'run_empty',
              defaultDatasetId: 'ds_empty',
              status: 'SUCCEEDED',
            },
          }),
        } as Response;
      }
      if (url.includes('/datasets/ds_empty/items')) {
        return {
          ok: true,
          status: 200,
          json: async () => [],
        } as Response;
      }
      return { ok: false, status: 404, text: async () => 'Not found' } as Response;
    });

    const items = await adapter.runActor('apify/instagram-scraper', { urls: ['https://fake.url'] });
    expect(items).toEqual([]);
  });

  it('handles scraper errors with typed error propagation', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 504,
      statusText: 'Gateway Timeout',
      text: async () => 'Actor timed out',
    } as Response);

    await expect(
      adapter.runActor('apify/instagram-scraper', { urls: ['https://slow.url'] }),
    ).rejects.toThrow('Apify API error: 504 Actor timed out');
  });

  it('honors AbortSignal and aborts immediately', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      adapter.runActor('apify/instagram-scraper', { urls: ['https://instagram.com/fast'] }, { signal: controller.signal }),
    ).rejects.toThrow('Apify operation aborted');
  });
});
