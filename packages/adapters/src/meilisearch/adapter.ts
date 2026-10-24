/**
 * Meilisearch adapter — ADR-022 compliant (7 obligations).
 * Used by M2/M5 for index projection, M3 for search queries.
 */
import { MeiliSearch, type Index } from 'meilisearch';

// ── Circuit Breaker State ────────────────────────────────────

interface CircuitState {
  status: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureAt: number;
  openedAt: number;
}

const circuit: CircuitState = {
  status: 'closed',
  failureCount: 0,
  lastFailureAt: 0,
  openedAt: 0,
};

const CIRCUIT_THRESHOLD = 10; // failures
const CIRCUIT_WINDOW_MS = 5 * 60 * 1000; // 5 min
const CIRCUIT_RECOVERY_MS = 30 * 1000; // 30s half-open probe

function recordFailure() {
  const now = Date.now();
  if (now - circuit.lastFailureAt > CIRCUIT_WINDOW_MS) {
    circuit.failureCount = 0;
  }
  circuit.failureCount++;
  circuit.lastFailureAt = now;
  if (circuit.failureCount >= CIRCUIT_THRESHOLD) {
    circuit.status = 'open';
    circuit.openedAt = now;
  }
}

function recordSuccess() {
  circuit.failureCount = 0;
  circuit.status = 'closed';
}

function isCircuitOpen(): boolean {
  if (circuit.status === 'closed') return false;
  if (circuit.status === 'open') {
    if (Date.now() - circuit.openedAt > CIRCUIT_RECOVERY_MS) {
      circuit.status = 'half-open';
      return false; // allow one probe
    }
    return true;
  }
  return false; // half-open: allow probe
}

// ── Retry with Exponential Backoff ───────────────────────────

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 200,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts - 1) {
        const delay = baseDelayMs * 2 ** attempt + Math.random() * 100;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

// ── Cost Emission (ADR-022 obligation 4) ─────────────────────

export interface MeilisearchCostEvent {
  provider: 'meilisearch';
  operation: 'index_upsert' | 'search' | 'health' | 'index_delete';
  unitCostUsd: number; // Meilisearch Cloud: near-zero marginal
  timestamp: string;
}

function emitCost(operation: MeilisearchCostEvent['operation']): MeilisearchCostEvent {
  return {
    provider: 'meilisearch',
    operation,
    unitCostUsd: 0, // Meilisearch Cloud has no per-operation cost
    timestamp: new Date().toISOString(),
  };
}

// ── Health Reporting (ADR-022 obligation 5) ──────────────────

export interface HealthReport {
  status: 'healthy' | 'degraded' | 'unavailable';
  latencyMs: number;
  indexStats: Record<string, number> | null;
  circuitStatus: CircuitState['status'];
  lastChecked: string;
}

// ── Degraded Mode Contract (ADR-022 obligation 6) ────────────

export type ProjectionResult =
  | { status: 'success'; cost: MeilisearchCostEvent }
  | { status: 'projection_deferred'; reason: string }
  | { status: 'error'; error: string };

export type DeletionResult =
  | { status: 'success'; cost: MeilisearchCostEvent }
  | { status: 'deletion_deferred'; reason: string }
  | { status: 'error'; error: string };

export type SearchResult =
  | {
      status: 'success';
      hits: unknown[];
      cost: MeilisearchCostEvent;
      totalHits?: number;
      estimatedTotalHits?: number;
    }
  | { status: 'degraded'; hits: []; reason: string }
  | { status: 'error'; error: string };

export interface ConfigureIndexResult {
  created: boolean;
  primaryKey: string;
  mismatchDetected: boolean;
  warning?: string;
}

// ── Adapter ──────────────────────────────────────────────────

export class MeilisearchAdapter {
  private client: MeiliSearch;
  private indexName: string;

  constructor(config: {
    host: string;
    apiKey: string;
    indexName?: string;
  }) {
    // Obligation 1: Credential management — from env config only
    this.client = new MeiliSearch({
      host: config.host,
      apiKey: config.apiKey,
    });
    this.indexName = config.indexName ?? 'creators';
  }

  private getIndex(): Index {
    return this.client.index(this.indexName);
  }

  // ── Obligation 4+5: Health + Cost ──────────────────────────

  async health(): Promise<HealthReport> {
    const start = Date.now();
    try {
      const health = await this.client.health();
      const index = this.getIndex();
      const stats = await index.getStats();
      recordSuccess();
      return {
        status: health.status === 'available' ? 'healthy' : 'degraded',
        latencyMs: Date.now() - start,
        indexStats: { numberOfDocuments: stats.numberOfDocuments },
        circuitStatus: circuit.status,
        lastChecked: new Date().toISOString(),
      };
    } catch {
      recordFailure();
      return {
        status: 'unavailable',
        latencyMs: Date.now() - start,
        indexStats: null,
        circuitStatus: circuit.status,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  // ── Obligation 6: Degraded-mode index upsert ──────────────

  async upsertDocument(doc: MeilisearchDocument): Promise<ProjectionResult> {
    if (isCircuitOpen()) {
      return {
        status: 'projection_deferred',
        reason: `Circuit breaker open (failures: ${circuit.failureCount}). Creator exists in GCP but not in search index. Background re-projection will catch up.`,
      };
    }

    if (!doc.creatorId || typeof doc.creatorId !== 'string' || doc.creatorId.trim() === '') {
      return {
        status: 'error',
        error: 'Document missing required primary key: creatorId',
      };
    }

    // Generate compatibility alias id strictly derived from canonical creatorId
    doc.id = doc.creatorId;

    try {
      // Obligation 2: Retry discipline (idempotent upsert)
      await withRetry(() => this.getIndex().addDocuments([doc], { primaryKey: 'creatorId' }));
      recordSuccess();
      return { status: 'success', cost: emitCost('index_upsert') };
    } catch (err) {
      recordFailure();
      return {
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown Meilisearch error',
      };
    }
  }

  async upsertDocuments(docs: MeilisearchDocument[]): Promise<ProjectionResult> {
    if (isCircuitOpen()) {
      return {
        status: 'projection_deferred',
        reason: `Circuit breaker open. ${docs.length} creators deferred.`,
      };
    }

    for (const doc of docs) {
      if (!doc.creatorId || typeof doc.creatorId !== 'string' || doc.creatorId.trim() === '') {
        return {
          status: 'error',
          error: 'Document missing required primary key: creatorId',
        };
      }
      // Generate compatibility alias id strictly derived from canonical creatorId
      doc.id = doc.creatorId;
    }

    try {
      await withRetry(() => this.getIndex().addDocuments(docs, { primaryKey: 'creatorId' }));
      recordSuccess();
      return { status: 'success', cost: emitCost('index_upsert') };
    } catch (err) {
      recordFailure();
      return {
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown Meilisearch error',
      };
    }
  }

  // ── Obligation 6: Degraded-mode index delete (GDPR Erasure / Step 2B.2) ──

  async deleteDocument(creatorId: string): Promise<DeletionResult> {
    if (isCircuitOpen()) {
      return {
        status: 'deletion_deferred',
        reason: `Circuit breaker open (failures: ${circuit.failureCount}). Deletion deferred.`,
      };
    }

    if (!creatorId || typeof creatorId !== 'string' || creatorId.trim() === '') {
      return {
        status: 'error',
        error: 'Document missing required primary key: creatorId',
      };
    }

    try {
      await withRetry(async () => {
        try {
          await this.getIndex().deleteDocument(creatorId);
        } catch (err: unknown) {
          // Idempotency: absent documents are treated as success
          const errorMsg = err instanceof Error ? err.message : String(err);
          const errorCode = (err as { code?: string; status?: number })?.code;
          const status = (err as { status?: number })?.status;
          if (
            status === 404 ||
            errorCode === 'document_not_found' ||
            errorCode === 'index_not_found' ||
            errorMsg.toLowerCase().includes('not found')
          ) {
            return;
          }
          throw err;
        }
      });
      recordSuccess();
      return { status: 'success', cost: emitCost('index_delete') };
    } catch (err) {
      recordFailure();
      return {
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown Meilisearch error',
      };
    }
  }

  // ── Obligation 6: Degraded-mode search ────────────────────

  async search(
    query: string,
    filters?: string,
    limit = 20,
    offset = 0,
  ): Promise<SearchResult> {
    if (isCircuitOpen()) {
      return {
        status: 'degraded',
        hits: [],
        reason: 'Search index unavailable. Circuit breaker open.',
      };
    }

    try {
      const searchOptions: Record<string, unknown> = {
        limit,
        offset,
      };
      if (filters && filters.trim() !== '') {
        searchOptions['filter'] = filters.trim();
      }
      const result = await withRetry(() =>
        this.getIndex().search(query, searchOptions),
      );
      recordSuccess();
      const rawResult = result as { totalHits?: number; estimatedTotalHits?: number };
      const totalHits = rawResult.totalHits ?? rawResult.estimatedTotalHits;
      return {
        status: 'success',
        hits: result.hits,
        totalHits,
        estimatedTotalHits: rawResult.estimatedTotalHits,
        cost: emitCost('search'),
      };
    } catch (err) {
      recordFailure();
      return {
        status: 'error',
        error: err instanceof Error ? err.message : 'Search failed',
      };
    }
  }

  // ── Obligation 5: Health reporting (ping + index stats) ────

  async ping(): Promise<boolean> {
    try {
      const health = await this.client.health();
      return health.status === 'available';
    } catch {
      return false;
    }
  }

  async getIndexStats(): Promise<{ numberOfDocuments: number; isIndexing: boolean } | null> {
    try {
      const stats = await this.getIndex().getStats();
      return {
        numberOfDocuments: stats.numberOfDocuments,
        isIndexing: false, // getStats doesn't expose indexing status directly
      };
    } catch {
      return null;
    }
  }

  // ── Index Configuration (Doc 15 B1 — filterable attributes) ──

  async createIndexIfNotExists(
    indexName: string,
    schema: Record<string, string>,
  ): Promise<void> {
    try {
      await this.client.createIndex(indexName, { primaryKey: 'creatorId' });
    } catch {
      // Index already exists — that's fine
    }
    const index = this.client.index(indexName);
    await index.updateSettings({
      filterableAttributes: Object.keys(schema).filter(
        (k) => schema[k] === 'filterable' || schema[k] === 'both',
      ),
      sortableAttributes: Object.keys(schema).filter(
        (k) => schema[k] === 'sortable' || schema[k] === 'both',
      ),
      searchableAttributes: Object.keys(schema).filter(
        (k) => schema[k] === 'searchable' || schema[k] === 'both',
      ),
    });
  }

  async configureIndex(): Promise<ConfigureIndexResult> {
    let created = false;
    try {
      await this.client.createIndex(this.indexName, { primaryKey: 'creatorId' });
      created = true;
    } catch {
      // Index already exists — createIndex does NOT change an existing index's primary key
    }
    const index = this.getIndex();

    await index.updateSettings({
      filterableAttributes: [
        'platform',
        'followerCount',
        'engagementRate',
        'geo',
        'language',
        'primaryNiche',
        'secondaryNiches',
        'authenticityBand',
        'qualityScore',
        'audiencePkShare',
        'audienceGccShare',
        'completenessTier',
        // Demographic filters (Problem 3)
        'audienceFemalePercent',
        'audienceMalePercent',
        'audienceAgeBands',
        'audienceCities',
        'audienceCountries',
        // Rising score (Problem 1)
        'risingScore',
      ],
      sortableAttributes: [
        'followerCount',
        'engagementRate',
        'qualityScore',
        'authenticityScore',
        'freshnessScore',
        'lastEnrichedAt',
        // Rising score (Problem 1)
        'risingScore',
      ],
      searchableAttributes: [
        'displayName',
        'primaryHandle',
        'handleVariants',
        'primaryNiche',
        'bio',
      ],
    });

    let currentPrimaryKey = 'creatorId';
    let mismatchDetected = false;
    let warning: string | undefined;

    try {
      const rawInfo = await index.getRawInfo();
      currentPrimaryKey = rawInfo.primaryKey ?? 'creatorId';
      if (rawInfo.primaryKey && rawInfo.primaryKey !== 'creatorId') {
        mismatchDetected = true;
        warning = `Index '${this.indexName}' already exists with primary key '${rawInfo.primaryKey}', not 'creatorId'. Meilisearch does not allow modifying the primary key of an existing index in place. Safe index recreation/migration procedure required.`;
        console.warn(`[MeilisearchAdapter] ${warning}`);
      }
    } catch {
      // Non-fatal if fetch rawInfo fails in mock/offline environments
    }

    return { created, primaryKey: currentPrimaryKey, mismatchDetected, warning };
  }

  async getPrimaryKey(indexName?: string): Promise<string | null> {
    try {
      const targetIndex = indexName ? this.client.index(indexName) : this.getIndex();
      const rawInfo = await targetIndex.getRawInfo();
      return rawInfo.primaryKey ?? null;
    } catch {
      return null;
    }
  }

  // ── Generic upsert/search (indexName parameter) ───────────

  async upsertDocumentToIndex(
    indexName: string,
    document: Record<string, unknown>,
  ): Promise<ProjectionResult> {
    if (isCircuitOpen()) {
      return {
        status: 'projection_deferred',
        reason: `Circuit breaker open. Document deferred to index: ${indexName}.`,
      };
    }

    const creatorId = document['creatorId'];
    if (!creatorId || typeof creatorId !== 'string' || creatorId.trim() === '') {
      return {
        status: 'error',
        error: 'Document missing required primary key: creatorId',
      };
    }

    // Canonical key enforcement: generate id strictly derived from creatorId.
    // Do not silently accept an id-only document and derive creatorId from it.
    document['id'] = creatorId;

    try {
      await withRetry(() =>
        this.client.index(indexName).addDocuments([document], { primaryKey: 'creatorId' }),
      );
      recordSuccess();
      return { status: 'success', cost: emitCost('index_upsert') };
    } catch (err) {
      recordFailure();
      return {
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown Meilisearch error',
      };
    }
  }

  async deleteDocumentFromIndex(
    indexName: string,
    creatorId: string,
  ): Promise<DeletionResult> {
    if (isCircuitOpen()) {
      return {
        status: 'deletion_deferred',
        reason: `Circuit breaker open (failures: ${circuit.failureCount}). Deletion deferred from index: ${indexName}.`,
      };
    }

    if (!creatorId || typeof creatorId !== 'string' || creatorId.trim() === '') {
      return {
        status: 'error',
        error: 'Document missing required primary key: creatorId',
      };
    }

    try {
      await withRetry(async () => {
        try {
          await this.client.index(indexName).deleteDocument(creatorId);
        } catch (err: unknown) {
          // Idempotency: absent documents are treated as success
          const errorMsg = err instanceof Error ? err.message : String(err);
          const errorCode = (err as { code?: string; status?: number })?.code;
          const status = (err as { status?: number })?.status;
          if (
            status === 404 ||
            errorCode === 'document_not_found' ||
            errorCode === 'index_not_found' ||
            errorMsg.toLowerCase().includes('not found')
          ) {
            return;
          }
          throw err;
        }
      });
      recordSuccess();
      return { status: 'success', cost: emitCost('index_delete') };
    } catch (err) {
      recordFailure();
      return {
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown Meilisearch error',
      };
    }
  }

  async searchDocuments(
    indexName: string,
    query: string,
    filterParams: Record<string, unknown>,
    limit = 20,
    offset = 0,
  ): Promise<SearchResult> {
    if (isCircuitOpen()) {
      return {
        status: 'degraded',
        hits: [],
        reason: 'Search index unavailable. Circuit breaker open.',
      };
    }
    try {
      const filterParts: string[] = [];
      for (const [key, value] of Object.entries(filterParams)) {
        if (value === undefined || value === null) continue;
        if (typeof value === 'string') filterParts.push(`${key} = "${value}"`);
        else if (typeof value === 'number') filterParts.push(`${key} >= ${value}`);
        else if (Array.isArray(value))
          filterParts.push(`${key} IN [${value.map((v) => `"${v}"`).join(', ')}]`);
      }
      const searchOptions: Record<string, unknown> = {
        limit,
        offset,
      };
      if (filterParts.length > 0) {
        searchOptions['filter'] = filterParts;
      }
      const result = await withRetry(() =>
        this.client.index(indexName).search(query, searchOptions),
      );
      recordSuccess();
      const rawResult = result as { totalHits?: number; estimatedTotalHits?: number };
      const totalHits = rawResult.totalHits ?? rawResult.estimatedTotalHits;
      return {
        status: 'success',
        hits: result.hits,
        totalHits,
        estimatedTotalHits: rawResult.estimatedTotalHits,
        cost: emitCost('search'),
      };
    } catch (err) {
      recordFailure();
      return {
        status: 'error',
        error: err instanceof Error ? err.message : 'Search failed',
      };
    }
  }

  // ── Obligation 7: Sandbox parity ──────────────────────────
  // Sandbox = Meilisearch Cloud dev instance, configured via env.
  // No code difference — host + apiKey point to dev instance.

  getCircuitStatus(): CircuitState['status'] {
    return circuit.status;
  }
}

// ── Meilisearch Document Schema (Doc 15 B1 / ADR-027 / Step 2B) ───────

export interface MeilisearchDocument {
  // Identity (primary key is creatorId; id retained as compatibility alias)
  creatorId: string;
  id?: string; // Backwards compatibility alias
  displayName: string;
  primaryHandle: string;
  handleVariants: string[];

  // Platform
  platform: string;
  canonicalUrl: string;
  followerCount: number;
  engagementRate: number | null;
  postCount?: number | null;
  lastPostAt: string | null;

  // Search & filter fields
  location?: string | null;
  languages?: string[];
  bio?: string | null;

  // LLM-derived attributes (write-path intelligence)
  primaryNiche: string;
  secondaryNiches: string[];
  authenticityBand: 'strong' | 'moderate' | 'weak' | 'unknown' | string | null;
  authenticityScore: number | null;
  qualityScore: number | null;
  audiencePkShare: number | null;
  audienceGccShare: number | null;
  audienceDiasporaShare: number | null;
  languageMix: Record<string, number> | string[] | null;
  summary: string | null;

  // Demographics (Problem 3)
  audienceFemalePercent: number | null;
  audienceMalePercent: number | null;
  audienceAgeBands: Record<string, number> | null;
  audienceCities: Record<string, number> | null;
  audienceCountries: Record<string, number> | null;

  // Rising score (Problem 1)
  risingScore: number | null;

  // Completeness
  completenessTier: string;
  enrichmentSource: string;

  // Freshness
  lastEnrichedAt: string | null;
  lastRefreshedAt?: string | null;
  indexProjectionVersion: number;
  createdAt?: string;
}

// ── Factory (Obligation 1 + 7: credentials from env, sandbox via config) ──

export function createMeilisearchAdapter(config: {
  host: string;
  apiKey: string;
  indexName?: string;
}): MeilisearchAdapter {
  return new MeilisearchAdapter(config);
}
