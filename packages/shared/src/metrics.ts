/**
 * Metrics Collection — DOC-023 §2 compliant.
 *
 * Provides structured metric emission for OTel/Grafana Cloud integration.
 * Metrics follow bounded-cardinality naming convention per DOC-023 §2.1.
 *
 * Naming: mushin.<domain>.<metric>
 * Attributes: bounded sets only (queue_class, adapter, module, job_type, error_code)
 * NEVER use workspace_id as a metric attribute (unbounded cardinality).
 */
import { createLogger } from './logger.js';

const logger = createLogger('metrics');

// ── Metric Types ───────────────────────────────────────────────

export type MetricType = 'counter' | 'gauge' | 'histogram';

export interface MetricValue {
  name: string;
  type: MetricType;
  value: number;
  attributes?: Record<string, string>;
  timestamp?: Date;
}

// ── In-Memory Metric Store ─────────────────────────────────────

const _counters = new Map<string, number>();
const _gauges = new Map<string, number>();
const _histograms = new Map<string, number[]>();

function metricKey(name: string, attributes?: Record<string, string>): string {
  if (!attributes) return name;
  const sorted = Object.entries(attributes).sort(([a], [b]) => a.localeCompare(b));
  return `${name}:${sorted.map(([k, v]) => `${k}=${v}`).join(',')}`;
}

// ── Counter Operations ─────────────────────────────────────────

export function incrementCounter(
  name: string,
  value: number = 1,
  attributes?: Record<string, string>,
): void {
  const key = metricKey(name, attributes);
  _counters.set(key, (_counters.get(key) ?? 0) + value);
}

// ── Gauge Operations ───────────────────────────────────────────

export function setGauge(
  name: string,
  value: number,
  attributes?: Record<string, string>,
): void {
  const key = metricKey(name, attributes);
  _gauges.set(key, value);
}

// ── Histogram Operations ───────────────────────────────────────

export function recordHistogram(
  name: string,
  value: number,
  attributes?: Record<string, string>,
): void {
  const key = metricKey(name, attributes);
  const values = _histograms.get(key) ?? [];
  values.push(value);
  _histograms.set(key, values);
}

// ── Metric Flushing ────────────────────────────────────────────

export function flushMetrics(): MetricValue[] {
  const metrics: MetricValue[] = [];
  const now = new Date();

  // Flush counters
  for (const [key, value] of _counters.entries()) {
    const [name, attrsStr] = key.split(':');
    const attributes = attrsStr ? Object.fromEntries(attrsStr.split(',').map(e => e.split('='))) : undefined;
    metrics.push({ name: name!, type: 'counter', value, attributes, timestamp: now });
  }

  // Flush gauges
  for (const [key, value] of _gauges.entries()) {
    const [name, attrsStr] = key.split(':');
    const attributes = attrsStr ? Object.fromEntries(attrsStr.split(',').map(e => e.split('='))) : undefined;
    metrics.push({ name: name!, type: 'gauge', value, attributes, timestamp: now });
  }

  // Flush histograms
  for (const [key, values] of _histograms.entries()) {
    const [name, attrsStr] = key.split(':');
    const attributes = attrsStr ? Object.fromEntries(attrsStr.split(',').map(e => e.split('='))) : undefined;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const p95 = values.sort((a, b) => a - b)[Math.floor(values.length * 0.95)] ?? 0;
    metrics.push({ name: `${name}.avg`, type: 'gauge', value: avg, attributes, timestamp: now });
    metrics.push({ name: `${name}.p95`, type: 'gauge', value: p95, attributes, timestamp: now });
    metrics.push({ name: `${name}.count`, type: 'counter', value: values.length, attributes, timestamp: now });
  }

  // Clear
  _counters.clear();
  _gauges.clear();
  _histograms.clear();

  return metrics;
}

// ── Periodic Metrics Export to Axiom ───────────────────────────

let _metricsFlushTimer: NodeJS.Timeout | null = null;
const METRICS_FLUSH_INTERVAL_MS = 30_000; // 30 seconds

/**
 * Start periodic metrics flush to Axiom.
 * Call once at server startup after initAxiom().
 */
export function startMetricsExport(): void {
  const token = process.env['AXIOM_TOKEN'];
  const dataset = process.env['AXIOM_DATASET'];

  if (!token || !dataset) {
    logger.info('Axiom not configured — metrics export disabled');
    return;
  }

  _metricsFlushTimer = setInterval(async () => {
    const metrics = flushMetrics();
    if (metrics.length === 0) return;

    try {
      const response = await fetch(`https://api.axiom.co/v1/datasets/${dataset}/ingest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Axiom-Source': 'mushin-metrics',
        },
        body: JSON.stringify(metrics.map(m => ({
          _time: m.timestamp?.toISOString(),
          metric_name: m.name,
          metric_type: m.type,
          metric_value: m.value,
          ...m.attributes,
        }))),
      });

      if (!response.ok) {
        logger.warn('Metrics export failed', { status: response.status });
      }
    } catch (err) {
      logger.warn('Metrics export error', { error: err instanceof Error ? err.message : 'unknown' });
    }
  }, METRICS_FLUSH_INTERVAL_MS);

  // Flush on process exit
  process.on('exit', () => {
    const remaining = flushMetrics();
    if (remaining.length > 0) {
      try {
        const token = process.env['AXIOM_TOKEN'];
        const dataset = process.env['AXIOM_DATASET'];
        if (token && dataset) {
          const body = JSON.stringify(remaining.map(m => ({
            _time: m.timestamp?.toISOString(),
            metric_name: m.name,
            metric_type: m.type,
            metric_value: m.value,
            ...m.attributes,
          })));
          const XHR = (globalThis as any).XMLHttpRequest;
          if (XHR) {
            const xhr = new XHR();
            xhr.open('POST', `https://api.axiom.co/v1/datasets/${dataset}/ingest`, false);
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(body);
          }
        }
      } catch {
        // Best effort on exit
      }
    }
  });

  logger.info('Metrics export started', { interval_ms: METRICS_FLUSH_INTERVAL_MS });
}

/**
 * Stop periodic metrics flush.
 */
export function stopMetricsExport(): void {
  if (_metricsFlushTimer) {
    clearInterval(_metricsFlushTimer);
    _metricsFlushTimer = null;
  }
  // Final flush
  flushMetrics();
}

// ── Structured Metric Emission (DOC-023 §2.2) ─────────────────

/** Credits metrics */
export function emitCreditReserved(amount: number, workspaceId: string): void {
  incrementCounter('mushin.credits.reserved', amount);
}

export function emitCreditSettled(amount: number): void {
  incrementCounter('mushin.credits.settled', amount);
}

export function emitCreditSwept(amount: number): void {
  incrementCounter('mushin.credits.swept', amount);
}

/** Queue metrics */
export function emitQueueDepth(depth: number, queueClass: string): void {
  setGauge('mushin.queue.depth', depth, { queue_class: queueClass });
}

export function emitQueueOldestMessage(ageSeconds: number, queueClass: string): void {
  setGauge('mushin.queue.oldest_message_age_s', ageSeconds, { queue_class: queueClass });
}

export function emitDLQDepth(depth: number): void {
  setGauge('mushin.queue.dlq_depth', depth);
}

/** Adapter metrics */
export function emitAdapterCall(adapter: string, durationMs: number, success: boolean): void {
  incrementCounter('mushin.adapter.calls', 1, { adapter, success: String(success) });
  recordHistogram('mushin.adapter.latency_ms', durationMs, { adapter });
}

export function emitAdapterError(adapter: string, errorCode: string): void {
  incrementCounter('mushin.adapter.errors', 1, { adapter, error_code: errorCode });
}

export function emitCircuitState(adapter: string, state: string): void {
  setGauge('mushin.adapter.circuit_state', state === 'open' ? 1 : 0, { adapter });
}

/** Job metrics */
export function emitJobCreated(jobType: string): void {
  incrementCounter('mushin.jobs.created', 1, { job_type: jobType });
}

export function emitJobCompleted(jobType: string, durationMs: number): void {
  incrementCounter('mushin.jobs.completed', 1, { job_type: jobType });
  recordHistogram('mushin.jobs.duration_ms', durationMs, { job_type: jobType });
}

export function emitJobFailed(jobType: string, errorCode: string): void {
  incrementCounter('mushin.jobs.failed', 1, { job_type: jobType, error_code: errorCode });
}

/** Security metrics */
export function emitWorkspaceMismatch(): void {
  incrementCounter('mushin.authz.workspace_mismatch');
}

export function emitWebhookSignatureFailure(source: string): void {
  incrementCounter('mushin.webhook.signature_failures', 1, { source });
}

/** Consent metrics */
export function emitConsentGateCheck(): void {
  incrementCounter('mushin.consent.last_gate_checks');
}

export function emitConsentGateBlock(): void {
  incrementCounter('mushin.consent.last_gate_blocks');
}

/** Outbox metrics */
export function emitOutboxRelayLag(ageSeconds: number): void {
  setGauge('mushin.outbox.relay_lag_s', ageSeconds);
}
