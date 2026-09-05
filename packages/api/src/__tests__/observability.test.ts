/**
 * Observability tests.
 * Tests metrics, SLO tracking, and health checks.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  incrementCounter, setGauge, recordHistogram, flushMetrics,
  emitCreditReserved, emitQueueDepth, emitAdapterCall, emitAdapterError,
} from '@mushin/shared';
import {
  calculateErrorBudget, calculateBurnRate, isBurnRatePaging,
  SLOTracker, API_SLO,
} from '@mushin/shared';
import {
  livenessCheck, runHealthChecks, registerHealthCheck, clearHealthChecks,
} from '@mushin/shared';

describe('Metrics', () => {
  beforeEach(() => {
    flushMetrics(); // Clear state
  });

  it('should increment counter', () => {
    incrementCounter('test.counter', 5);
    incrementCounter('test.counter', 3);
    const metrics = flushMetrics();
    const counter = metrics.find(m => m.name === 'test.counter');
    expect(counter?.value).toBe(8);
  });

  it('should set gauge', () => {
    setGauge('test.gauge', 42);
    const metrics = flushMetrics();
    const gauge = metrics.find(m => m.name === 'test.gauge');
    expect(gauge?.value).toBe(42);
  });

  it('should record histogram', () => {
    recordHistogram('test.hist', 10);
    recordHistogram('test.hist', 20);
    recordHistogram('test.hist', 30);
    const metrics = flushMetrics();
    expect(metrics.some(m => m.name === 'test.hist.avg')).toBe(true);
    expect(metrics.some(m => m.name === 'test.hist.p95')).toBe(true);
    expect(metrics.some(m => m.name === 'test.hist.count')).toBe(true);
  });

  it('should emit credit metrics', () => {
    emitCreditReserved(100, 'ws-001');
    const metrics = flushMetrics();
    expect(metrics.some(m => m.name === 'mushin.credits.reserved')).toBe(true);
  });

  it('should emit queue depth', () => {
    emitQueueDepth(500, 'q-outbox-relay');
    const metrics = flushMetrics();
    const gauge = metrics.find(m => m.name === 'mushin.queue.depth');
    expect(gauge?.value).toBe(500);
  });

  it('should emit adapter metrics', () => {
    emitAdapterCall('meilisearch', 150, true);
    emitAdapterError('meilisearch', 'TIMEOUT');
    const metrics = flushMetrics();
    expect(metrics.some(m => m.name === 'mushin.adapter.calls')).toBe(true);
    expect(metrics.some(m => m.name === 'mushin.adapter.errors')).toBe(true);
  });
});

describe('SLO Tracking', () => {
  it('should calculate error budget for 99.9% over 30 days', () => {
    const budget = calculateErrorBudget(API_SLO);
    // 99.9% = 0.1% downtime = 0.001 * 30 * 24 * 60 * 60 = 2592 seconds = 43.2 minutes
    expect(budget).toBeCloseTo(2592, 0);
  });

  it('should calculate burn rate', () => {
    const burnRate = calculateBurnRate(API_SLO, 0.001); // 0.1% error rate
    expect(burnRate).toBeCloseTo(1, 1); // Matches the allowed error rate
  });

  it('should detect paging burn rate', () => {
    expect(isBurnRatePaging(14.5)).toBe(true);
    expect(isBurnRatePaging(14.3)).toBe(false);
    expect(isBurnRatePaging(1)).toBe(false);
  });

  it('should track SLO status', () => {
    const tracker = new SLOTracker(API_SLO);

    // Record 100 successful requests
    for (let i = 0; i < 100; i++) {
      tracker.recordRequest(100, true);
    }

    const status = tracker.getStatus();
    expect(status.name).toBe('api-availability');
    expect(status.currentAvailability).toBe(1);
    expect(status.isPaging).toBe(false);
  });

  it('should detect degraded availability', () => {
    const tracker = new SLOTracker(API_SLO);

    // Record 90 successful, 10 failed
    for (let i = 0; i < 90; i++) {
      tracker.recordRequest(100, true);
    }
    for (let i = 0; i < 10; i++) {
      tracker.recordRequest(100, false);
    }

    const status = tracker.getStatus();
    expect(status.currentAvailability).toBe(0.9);
    expect(status.burnRate).toBeGreaterThan(1);
  });
});

describe('Health Checks', () => {
  it('should return healthy liveness check', () => {
    const result = livenessCheck();
    expect(result.status).toBe('healthy');
    expect(result.uptime).toBeGreaterThanOrEqual(0);
  });

  it('should run registered health checks', async () => {
    registerHealthCheck('test-check', async () => ({
      status: 'healthy',
    }));

    const result = await runHealthChecks();
    expect(result.checks['test-check']).toBeDefined();
    expect(result.checks['test-check']!.status).toBe('healthy');
  });

  it('should handle failing health checks', async () => {
    registerHealthCheck('failing-check', async () => {
      throw new Error('Connection refused');
    });

    const result = await runHealthChecks();
    expect(result.checks['failing-check']!.status).toBe('unhealthy');
    expect(result.status).toBe('unhealthy');
  });

  it('should aggregate health status', async () => {
    clearHealthChecks();
    registerHealthCheck('healthy-check', async () => ({ status: 'healthy' }));
    registerHealthCheck('degraded-check', async () => ({ status: 'degraded' }));

    const result = await runHealthChecks();
    expect(result.status).toBe('degraded');
  });
});
