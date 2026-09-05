/**
 * Cost Circuit Breaker — ADR-037 compliant.
 *
 * Two independent breakers:
 * 1. Per-workspace: If trailing 24h AI+scraping cost exceeds 5x plan tier's expected cost,
 *    pause new job submissions. In-flight jobs complete normally.
 * 2. Per-provider: If total spend against a single provider spikes abnormally,
 *    trip breaker that falls back to next routing ladder rung or pauses provider.
 *
 * Implementation uses in-memory counters (production would use Redis).
 */
import { createLogger } from './logger.js';

const logger = createLogger('cost-circuit-breaker');

// ── Types ──────────────────────────────────────────────────────

export type CircuitStatus = 'closed' | 'open' | 'half-open';

export interface PerWorkspaceCircuit {
  workspaceId: string;
  status: CircuitStatus;
  totalCostUsd: number;
  thresholdUsd: number;
  windowStart: Date;
  openedAt: Date | null;
}

export interface PerProviderCircuit {
  provider: string;
  status: CircuitStatus;
  totalCostUsd: number;
  thresholdUsd: number;
  windowStart: Date;
  openedAt: Date | null;
}

// ── Plan Tier Cost Thresholds ──────────────────────────────────

const PLAN_COST_THRESHOLDS: Record<string, number> = {
  free: 5.0,      // $5/day threshold
  starter: 25.0,   // $25/day
  growth: 100.0,   // $100/day
  agency: 500.0,   // $500/day
  enterprise: 2000.0, // $2000/day
};

// ── Per-Workspace Circuit Breaker ──────────────────────────────

const workspaceCircuits = new Map<string, PerWorkspaceCircuit>();

export function checkWorkspaceCost(
  workspaceId: string,
  planTier: string,
  costUsd: number,
): { allowed: boolean; circuit: PerWorkspaceCircuit } {
  const threshold = PLAN_COST_THRESHOLDS[planTier] ?? PLAN_COST_THRESHOLDS['free']!;

  let circuit = workspaceCircuits.get(workspaceId);
  const now = new Date();

  // Initialize or reset circuit if window expired
  if (!circuit || (now.getTime() - circuit.windowStart.getTime() > 24 * 60 * 60 * 1000)) {
    circuit = {
      workspaceId,
      status: 'closed',
      totalCostUsd: 0,
      thresholdUsd: threshold,
      windowStart: now,
      openedAt: null,
    };
    workspaceCircuits.set(workspaceId, circuit);
  }

  // Check if circuit is open
  if (circuit.status === 'open') {
    // Check if recovery window passed (30 min)
    if (circuit.openedAt && now.getTime() - circuit.openedAt.getTime() > 30 * 60 * 1000) {
      circuit.status = 'half-open';
      logger.info('Workspace circuit half-open', { workspaceId });
    } else {
      return { allowed: false, circuit };
    }
  }

  // Add cost and check threshold
  circuit.totalCostUsd += costUsd;

  if (circuit.totalCostUsd > circuit.thresholdUsd * 5) {
    circuit.status = 'open';
    circuit.openedAt = now;
    logger.warn('Workspace cost circuit OPENED', {
      workspaceId,
      totalCost: circuit.totalCostUsd,
      threshold: circuit.thresholdUsd,
    });
    return { allowed: false, circuit };
  }

  return { allowed: true, circuit };
}

export function getWorkspaceCircuit(workspaceId: string): PerWorkspaceCircuit | undefined {
  return workspaceCircuits.get(workspaceId);
}

// ── Per-Provider Circuit Breaker ───────────────────────────────

const providerCircuits = new Map<string, PerProviderCircuit>();

const PROVIDER_COST_THRESHOLDS: Record<string, number> = {
  llm: 50.0,       // $50/hour for LLM
  apify: 20.0,     // $20/hour for scraping
  serper: 10.0,    // $10/hour for search
  meilisearch: 5.0, // $5/hour for search
  resend: 5.0,     // $5/hour for email
};

export function checkProviderCost(
  provider: string,
  costUsd: number,
): { allowed: boolean; circuit: PerProviderCircuit } {
  const threshold = PROVIDER_COST_THRESHOLDS[provider] ?? 50.0;

  let circuit = providerCircuits.get(provider);
  const now = new Date();

  // Initialize or reset circuit if window expired (1 hour)
  if (!circuit || (now.getTime() - circuit.windowStart.getTime() > 60 * 60 * 1000)) {
    circuit = {
      provider,
      status: 'closed',
      totalCostUsd: 0,
      thresholdUsd: threshold,
      windowStart: now,
      openedAt: null,
    };
    providerCircuits.set(provider, circuit);
  }

  // Check if circuit is open
  if (circuit.status === 'open') {
    if (circuit.openedAt && now.getTime() - circuit.openedAt.getTime() > 5 * 60 * 1000) {
      circuit.status = 'half-open';
      logger.info('Provider circuit half-open', { provider });
    } else {
      return { allowed: false, circuit };
    }
  }

  // Add cost and check threshold
  circuit.totalCostUsd += costUsd;

  if (circuit.totalCostUsd > circuit.thresholdUsd) {
    circuit.status = 'open';
    circuit.openedAt = now;
    logger.warn('Provider cost circuit OPENED', {
      provider,
      totalCost: circuit.totalCostUsd,
      threshold: circuit.thresholdUsd,
    });
    return { allowed: false, circuit };
  }

  return { allowed: true, circuit };
}

export function getProviderCircuit(provider: string): PerProviderCircuit | undefined {
  return providerCircuits.get(provider);
}

// ── Cost Event Emission ────────────────────────────────────────

export interface CostEvent {
  provider: string;
  workspaceId?: string;
  costUsd: number;
  operation: string;
  timestamp: Date;
}

export function emitCostEvent(event: CostEvent): void {
  // Emit to metrics
  // In production, this would write to a cost tracking table or Redis

  logger.info('Cost event', {
    provider: event.provider,
    workspaceId: event.workspaceId,
    costUsd: event.costUsd,
    operation: event.operation,
  });

  // Check per-workspace circuit
  if (event.workspaceId) {
    const { allowed } = checkWorkspaceCost(event.workspaceId, 'free', event.costUsd);
    if (!allowed) {
      logger.warn('Workspace cost limit exceeded', { workspaceId: event.workspaceId });
    }
  }

  // Check per-provider circuit
  const { allowed } = checkProviderCost(event.provider, event.costUsd);
  if (!allowed) {
    logger.warn('Provider cost limit exceeded', { provider: event.provider });
  }
}

// ── Reset (for testing) ────────────────────────────────────────

export function resetCircuitBreakers(): void {
  workspaceCircuits.clear();
  providerCircuits.clear();
}
