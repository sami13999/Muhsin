/**
 * Health Check System — DOC-023 compliant.
 *
 * Provides health check endpoints for workers and services.
 * Used by load balancers, Kubernetes, and monitoring systems.
 */
import { createLogger } from './logger.js';

const logger = createLogger('health');

// ── Health Status ──────────────────────────────────────────────

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthCheckResult {
  status: HealthStatus;
  timestamp: string;
  uptime: number;
  checks: Record<string, ComponentHealth>;
}

export interface ComponentHealth {
  status: HealthStatus;
  latencyMs?: number;
  message?: string;
  lastChecked?: string;
}

// ── Health Checker ─────────────────────────────────────────────

const _startTime = Date.now();
const _checks = new Map<string, () => Promise<ComponentHealth>>();

/**
 * Register a health check function.
 */
export function registerHealthCheck(
  name: string,
  checkFn: () => Promise<ComponentHealth>,
): void {
  _checks.set(name, checkFn);
}

/**
 * Clear all registered health checks (for testing).
 */
export function clearHealthChecks(): void {
  _checks.clear();
}

/**
 * Run all health checks and return aggregated status.
 */
export async function runHealthChecks(): Promise<HealthCheckResult> {
  const checks: Record<string, ComponentHealth> = {};
  let overallStatus: HealthStatus = 'healthy';

  for (const [name, checkFn] of _checks.entries()) {
    try {
      const start = Date.now();
      const result = await checkFn();
      result.latencyMs = Date.now() - start;
      result.lastChecked = new Date().toISOString();
      checks[name] = result;

      if (result.status === 'unhealthy') {
        overallStatus = 'unhealthy';
      } else if (result.status === 'degraded' && overallStatus !== 'unhealthy') {
        overallStatus = 'degraded';
      }
    } catch (err) {
      checks[name] = {
        status: 'unhealthy',
        message: err instanceof Error ? err.message : 'Unknown error',
        lastChecked: new Date().toISOString(),
      };
      overallStatus = 'unhealthy';
    }
  }

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - _startTime) / 1000),
    checks,
  };
}

/**
 * Simple liveness check (always returns healthy if process is running).
 */
export function livenessCheck(): HealthCheckResult {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - _startTime) / 1000),
    checks: {},
  };
}

// ── Built-in Health Checks ─────────────────────────────────────

/**
 * Database connectivity check.
 */
export function createDatabaseCheck(db: { execute: (query: unknown) => Promise<unknown> }): () => Promise<ComponentHealth> {
  return async () => {
    try {
      await db.execute('SELECT 1');
      return { status: 'healthy' };
    } catch (err) {
      return {
        status: 'unhealthy',
        message: err instanceof Error ? err.message : 'Database connection failed',
      };
    }
  };
}

/**
 * Redis connectivity check.
 */
export function createRedisCheck(redis: { ping: () => Promise<string> }): () => Promise<ComponentHealth> {
  return async () => {
    try {
      await redis.ping();
      return { status: 'healthy' };
    } catch (err) {
      return {
        status: 'degraded',
        message: err instanceof Error ? err.message : 'Redis connection failed',
      };
    }
  };
}

/**
 * Queue depth check.
 */
export function createQueueDepthCheck(
  getDepth: () => Promise<number>,
  threshold: number = 1000,
): () => Promise<ComponentHealth> {
  return async () => {
    try {
      const depth = await getDepth();
      if (depth > threshold) {
        return {
          status: 'degraded',
          message: `Queue depth ${depth} exceeds threshold ${threshold}`,
        };
      }
      return { status: 'healthy' };
    } catch (err) {
      return {
        status: 'unhealthy',
        message: err instanceof Error ? err.message : 'Queue check failed',
      };
    }
  };
}
