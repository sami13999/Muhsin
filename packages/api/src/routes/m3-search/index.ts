/**
 * M3 Search Coordinator — Route registration.
 * Registers all search endpoints under /api/v1/creators/ and /api/v1/search/.
 */
import { Hono } from 'hono';
import type { MeilisearchAdapter, LLMAdapter, SerperAdapter, ApifyAdapter } from '@mushin/adapters';
import { createSerperAdapter, createApifyAdapter } from '@mushin/adapters';
import type { Database } from '@mushin/database';
import { createSearchRoutes } from './filtered-search.js';
import { createNLSearchRoutes } from './nl-search.js';
import { createLiveSearchRoutes } from './live-search.js';
import { createQuoteRoutes } from './quote.js';
import { createTrendingRoutes } from './trending.js';

export function createM3Routes(
  meilisearch: MeilisearchAdapter,
  llm: LLMAdapter,
  db: Database,
  serper?: SerperAdapter,
  apify?: ApifyAdapter,
): Hono {
  const routes = new Hono();

  const serperAdapter = serper ?? createSerperAdapter({ apiKey: process.env['SERPER_API_KEY'] ?? 'mock-serper-key' });
  const apifyAdapter = apify ?? createApifyAdapter({ apiKey: process.env['APIFY_API_KEY'] ?? process.env['APIFY_TOKEN'] ?? 'mock-apify-key' });

  // Mount search endpoints
  routes.route('/creators', createSearchRoutes(meilisearch));
  routes.route('/creators', createNLSearchRoutes(meilisearch, llm));
  routes.route('/creators', createLiveSearchRoutes(serperAdapter, apifyAdapter, llm, db, meilisearch));
  routes.route('/creators', createTrendingRoutes(db));
  routes.route('/search', createQuoteRoutes());

  return routes;
}

