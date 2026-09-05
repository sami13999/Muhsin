/**
 * SLO & Error Budget Tracking — ADR-036 compliant.
 *
 * Tracks availability and latency SLOs with error budget consumption.
 * burn-rate alert when monthly budget burned in < 1 week.
 */
import { createLogger } from './logger.js';

const logger = createLogger('slo');

// ── SLO Definitions ────────────────────────────────────────────

export interface SLODefinition {
  /** SLO name */
  name: string;
  /** Target availability (0-1) */
  availabilityTarget: number;
  /** Latency target in ms */
  latencyTargetMs: number;
  /** Window in seconds (default: 30 days) */
  windowSeconds: number;
}

export const API_SLO: SLODefinition = {
  name: 'api-availability',
  availabilityTarget: 0.999, // 99.9%
  latencyTargetMs: 1000,
  windowSeconds: 30 * 24 * 60 * 60, // 30 days
};

// ── Error Budget Calculator ────────────────────────────────────

/**
 * Calculate monthly error budget in seconds.
 * At 99.9% availability over 30 days = 43.2 minutes of allowed downtime.
 */
export function calculateErrorBudget(slo: SLODefinition): number {
  const totalSeconds = slo.windowSeconds;
  const allowedDowntime = totalSeconds * (1 - slo.availabilityTarget);
  return allowedDowntime;
}

/**
 * Calculate error budget consumption percentage.
 */
export function calculateBudgetConsumption(
  slo: SLODefinition,
  downtimeSeconds: number,
): number {
  const budget = calculateErrorBudget(slo);
  return Math.min(100, (downtimeSeconds / budget) * 100);
}

// ── Burn Rate Calculator ───────────────────────────────────────

/**
 * Calculate burn rate: how fast is the error budget being consumed?
 * burn_rate = (actual_error_rate / allowed_error_rate)
 *
 * If burn_rate > 1, budget is being consumed faster than allowed.
 * If burn_rate > 14.4, monthly budget will be exhausted in < 1 week.
 */
export function calculateBurnRate(
  slo: SLODefinition,
  errorRate: number,
): number {
  const allowedErrorRate = 1 - slo.availabilityTarget;
  if (allowedErrorRate === 0) return Infinity;
  return errorRate / allowedErrorRate;
}

/**
 * Check if burn rate triggers a paging alert.
 * Per ADR-036: burn-rate > 14.4 (budget exhausted in < 1 week) is a paging event.
 */
export function isBurnRatePaging(burnRate: number): boolean {
  return burnRate > 14.4;
}

// ── SLO Tracker ────────────────────────────────────────────────

export interface SLOStatus {
  name: string;
  availabilityTarget: number;
  currentAvailability: number;
  errorBudgetTotal: number;
  errorBudgetConsumed: number;
  errorBudgetRemaining: number;
  burnRate: number;
  isPaging: boolean;
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
}

export class SLOTracker {
  private slo: SLODefinition;
  private totalRequests = 0;
  private failedRequests = 0;
  private latencySamples: number[] = [];
  private downtimeSeconds = 0;
  private windowStart: Date;

  constructor(slo: SLODefinition) {
    this.slo = slo;
    this.windowStart = new Date();
  }

  recordRequest(latencyMs: number, success: boolean): void {
    this.totalRequests++;
    if (!success) this.failedRequests++;
    this.latencySamples.push(latencyMs);

    // Keep only last 1000 samples for percentile calculation
    if (this.latencySamples.length > 1000) {
      this.latencySamples = this.latencySamples.slice(-1000);
    }
  }

  recordDowntime(seconds: number): void {
    this.downtimeSeconds += seconds;
  }

  getStatus(): SLOStatus {
    const errorRate = this.totalRequests > 0
      ? this.failedRequests / this.totalRequests
      : 0;

    const actualAvailability = this.totalRequests > 0
      ? 1 - errorRate
      : 1;

    const budget = calculateErrorBudget(this.slo);
    const consumed = this.downtimeSeconds;
    const remaining = Math.max(0, budget - consumed);
    const burnRate = calculateBurnRate(this.slo, errorRate);

    // Calculate latency percentiles
    const sorted = [...this.latencySamples].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
    const p99 = sorted[Math.floor(sorted.length * 0.99)] ?? 0;

    return {
      name: this.slo.name,
      availabilityTarget: this.slo.availabilityTarget,
      currentAvailability: actualAvailability,
      errorBudgetTotal: budget,
      errorBudgetConsumed: consumed,
      errorBudgetRemaining: remaining,
      burnRate,
      isPaging: isBurnRatePaging(burnRate),
      latencyP50: p50,
      latencyP95: p95,
      latencyP99: p99,
    };
  }

  reset(): void {
    this.totalRequests = 0;
    this.failedRequests = 0;
    this.latencySamples = [];
    this.downtimeSeconds = 0;
    this.windowStart = new Date();
  }
}

// ── Singleton Tracker ──────────────────────────────────────────

let _apiTracker: SLOTracker | null = null;

export function getAPITracker(): SLOTracker {
  if (!_apiTracker) {
    _apiTracker = new SLOTracker(API_SLO);
  }
  return _apiTracker;
}
