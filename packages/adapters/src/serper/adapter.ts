/**
 * Serper adapter — Google SERP API for creator discovery.
 * ADR-022 compliant (circuit breaker, retry, cost emission).
 */
import type { AdapterHealthReport } from '../shared/types.js';

// ── Types ────────────────────────────────────────────────────

export interface SerperConfig {
  apiKey: string;
}

export interface SerperSearchResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

export interface SerperResponse {
  searchParameters: {
    q: string;
    type: string;
  };
  organic: SerperSearchResult[];
  knowledgeGraph?: {
    title: string;
    type: string;
    description?: string;
    imageUrl?: string;
    attributes?: Record<string, string>;
  };
}

export interface SerperCostEvent {
  provider: 'serper';
  operation: 'search';
  query: string;
  resultCount: number;
  unitCostUsd: number;
  timestamp: string;
}

// ── Circuit Breaker ──────────────────────────────────────────

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

const CIRCUIT_THRESHOLD = 5;
const CIRCUIT_WINDOW_MS = 5 * 60 * 1000;
const CIRCUIT_RECOVERY_MS = 30 * 1000;

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
      return false;
    }
    return true;
  }
  return false;
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

// ── Adapter ──────────────────────────────────────────────────

export class SerperAdapter {
  private config: SerperConfig;

  constructor(config: SerperConfig) {
    this.config = config;
  }

  /**
   * Search Google for creator profiles.
   * Used by discovery pipeline to find creators by niche, platform, etc.
   */
  async search(query: string, options?: {
    country?: string;
    language?: string;
    numResults?: number;
  }): Promise<SerperSearchResult[]> {
    if (isCircuitOpen()) {
      throw new Error('Serper circuit breaker open');
    }

    try {
      const result = await withRetry(async () => {
        const res = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'X-API-KEY': this.config.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: query,
            gl: options?.country ?? 'us',
            hl: options?.language ?? 'en',
            num: options?.numResults ?? 10,
          }),
        });

        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Serper API error: ${res.status} ${body}`);
        }

        return res.json() as Promise<SerperResponse>;
      });

      recordSuccess();
      return result.organic ?? [];
    } catch (err) {
      recordFailure();
      throw err;
    }
  }

  /**
   * Search for social media profiles specifically.
   * Returns results filtered for social platforms.
   */
  async searchSocialProfiles(query: string, platform?: string): Promise<SerperSearchResult[]> {
    const platformQuery = platform
      ? `site:${platform}.com ${query}`
      : `site:instagram.com OR site:tiktok.com OR site:youtube.com OR site:twitter.com ${query}`;

    return this.search(platformQuery);
  }

  /**
   * Health check.
   */
  async health(): Promise<AdapterHealthReport> {
    const start = Date.now();
    try {
      await this.search('test', { numResults: 1 });
      recordSuccess();
      return {
        status: 'healthy',
        latencyMs: Date.now() - start,
        lastChecked: new Date().toISOString(),
        circuitStatus: circuit.status,
      };
    } catch {
      recordFailure();
      return {
        status: 'unavailable',
        latencyMs: Date.now() - start,
        lastChecked: new Date().toISOString(),
        circuitStatus: circuit.status,
      };
    }
  }

  getCircuitStatus(): CircuitState['status'] {
    return circuit.status;
  }
}

// ── Factory ──────────────────────────────────────────────────

export function createSerperAdapter(config: SerperConfig): SerperAdapter {
  return new SerperAdapter(config);
}
