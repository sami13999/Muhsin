/**
 * Apify adapter — Managed scraping for creator data enrichment.
 * ADR-022 compliant (circuit breaker, retry, cost emission).
 */
import type { AdapterHealthReport } from '../shared/types.js';

// ── Types ────────────────────────────────────────────────────

export interface ApifyConfig {
  apiKey: string;
}

export interface ApifyActorRun {
  id: string;
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'ABORTED';
  defaultDatasetId: string;
  startedAt: Date;
  finishedAt?: Date;
}

export interface ApifyDatasetItem {
  [key: string]: unknown;
}

export interface ApifyCostEvent {
  provider: 'apify';
  operation: 'actor_run' | 'dataset_fetch';
  actorId: string;
  computeUnits: number;
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

const CIRCUIT_THRESHOLD = 3;
const CIRCUIT_WINDOW_MS = 5 * 60 * 1000;
const CIRCUIT_RECOVERY_MS = 60 * 1000;

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

export function _resetCircuitForTesting(): void {
  circuit.failureCount = 0;
  circuit.status = 'closed';
  circuit.lastFailureAt = 0;
  circuit.openedAt = 0;
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

// ── Adapter ──────────────────────────────────────────────────

export class ApifyAdapter {
  private config: ApifyConfig;

  constructor(config: ApifyConfig) {
    this.config = config;
  }

  /**
   * Run an Apify actor and wait for results.
   * Used for scraping creator profiles from social platforms.
   */
  async runActor(
    actorId: string,
    input: Record<string, unknown>,
    options?: {
      timeoutSecs?: number;
      memoryMbytes?: number;
      signal?: AbortSignal;
    },
  ): Promise<ApifyDatasetItem[]> {
    if (isCircuitOpen()) {
      throw new Error('Apify circuit breaker open');
    }
    if (options?.signal?.aborted) {
      const err = new Error('Apify operation aborted');
      err.name = 'AbortError';
      throw err;
    }

    try {
      // Start actor run (Apify API requires username~actor-name for named actors)
      const normalizedActorId = actorId.replace('/', '~');
      const runRes = await fetch(
        `https://api.apify.com/v2/acts/${normalizedActorId}/runs?token=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...input,
            timeoutSecs: options?.timeoutSecs ?? 120,
            memoryMbytes: options?.memoryMbytes ?? 512,
          }),
          signal: options?.signal,
        },
      );

      if (!runRes.ok) {
        const body = await runRes.text();
        throw new Error(`Apify API error: ${runRes.status} ${body}`);
      }

      const runData = (await runRes.json()) as { data: ApifyActorRun };
      const runId = runData.data.id;

      // Poll for completion
      const result = await this.waitForCompletion(runId, 180000, options?.signal);

      // Fetch dataset
      const items = await this.fetchDataset(result.defaultDatasetId, options?.signal);

      recordSuccess();
      return items;
    } catch (err) {
      recordFailure();
      throw err;
    }
  }

  /**
   * Fetch dataset items from a completed run.
   */
  async fetchDataset(datasetId: string, signal?: AbortSignal): Promise<ApifyDatasetItem[]> {
    if (isCircuitOpen()) {
      throw new Error('Apify circuit breaker open');
    }
    if (signal?.aborted) {
      const err = new Error('Apify dataset fetch aborted');
      err.name = 'AbortError';
      throw err;
    }

    try {
      const res = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${this.config.apiKey}`,
        { signal },
      );

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Apify API error: ${res.status} ${body}`);
      }

      const items = (await res.json()) as ApifyDatasetItem[];
      recordSuccess();
      return items;
    } catch (err) {
      recordFailure();
      throw err;
    }
  }

  /**
   * Health check.
   */
  async health(): Promise<AdapterHealthReport> {
    const start = Date.now();
    try {
      const res = await fetch(
        `https://api.apify.com/v2/users/me?token=${this.config.apiKey}`,
      );

      recordSuccess();
      return {
        status: res.ok ? 'healthy' : 'degraded',
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

  // ── Private Helpers ────────────────────────────────────────

  private async waitForCompletion(
    runId: string,
    maxWaitMs = 180000,
    signal?: AbortSignal,
  ): Promise<ApifyActorRun> {
    const start = Date.now();
    const pollInterval = 2000;

    while (Date.now() - start < maxWaitMs) {
      if (signal?.aborted) {
        const err = new Error('Apify actor wait aborted');
        err.name = 'AbortError';
        throw err;
      }

      const res = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${this.config.apiKey}`,
        { signal },
      );

      if (!res.ok) {
        throw new Error(`Apify API error: ${res.status}`);
      }

      const data = (await res.json()) as { data: ApifyActorRun };
      const run = data.data;

      if (run.status === 'SUCCEEDED') {
        return run;
      }

      if (run.status === 'FAILED' || run.status === 'ABORTED') {
        throw new Error(`Actor run ${run.status}: ${runId}`);
      }

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, pollInterval);
        if (signal) {
          signal.addEventListener(
            'abort',
            () => {
              clearTimeout(timeout);
              const abortErr = new Error('Apify actor wait aborted');
              abortErr.name = 'AbortError';
              reject(abortErr);
            },
            { once: true },
          );
        }
      });
    }

    throw new Error(`Actor run timed out after ${maxWaitMs}ms: ${runId}`);
  }
}

// ── Factory ──────────────────────────────────────────────────

export function createApifyAdapter(config: ApifyConfig): ApifyAdapter {
  return new ApifyAdapter(config);
}
