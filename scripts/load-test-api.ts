/**
 * API Load Testing Framework
 *
 * Tests API performance under concurrent load.
 * Measures: latency (p50, p95, p99), throughput, error rate.
 *
 * Usage: npx tsx scripts/load-test-api.ts [concurrent] [duration]
 * Example: npx tsx scripts/load-test-api.ts 100 60
 */
import { readFileSync } from 'fs';

// ── Config ─────────────────────────────────────────────────────

const env: Record<string, string> = {};
try {
  readFileSync('.env', 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_]+)="?(.+?)"?\s*$/);
    if (m) env[m[1]] = m[2];
  });
} catch { /* ignore */ }

const API_BASE = env['APP_URL'] || 'http://localhost:3000';
const CONCURRENT = parseInt(process.argv[2] || '50');
const DURATION_SEC = parseInt(process.argv[3] || '30');

// ── Types ──────────────────────────────────────────────────────

interface RequestResult {
  status: number;
  latencyMs: number;
  error?: string;
}

interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  errorRate: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  requestsPerSecond: number;
  durationSeconds: number;
}

// ── Request Runner ─────────────────────────────────────────────

async function makeRequest(endpoint: string): Promise<RequestResult> {
  const start = Date.now();
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    const latencyMs = Date.now() - start;
    return { status: response.status, latencyMs };
  } catch (err) {
    return {
      status: 0,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// ── Load Test Runner ───────────────────────────────────────────

async function runLoadTest(
  endpoint: string,
  concurrent: number,
  durationSec: number,
): Promise<LoadTestResult> {
  const results: RequestResult[] = [];
  const startTime = Date.now();
  const endTime = startTime + durationSec * 1000;

  console.log(`\n🔥 Load Testing: ${endpoint}`);
  console.log(`   Concurrent: ${concurrent}`);
  console.log(`   Duration: ${durationSec}s`);
  console.log('');

  // Run concurrent workers
  const workers = Array.from({ length: concurrent }, async () => {
    while (Date.now() < endTime) {
      const result = await makeRequest(endpoint);
      results.push(result);

      // Small delay to prevent overwhelming
      await new Promise(r => setTimeout(r, 10));
    }
  });

  await Promise.all(workers);

  // Calculate statistics
  const latencies = results.map(r => r.latencyMs).sort((a, b) => a - b);
  const successful = results.filter(r => r.status >= 200 && r.status < 400);
  const failed = results.filter(r => r.status === 0 || r.status >= 400);

  const duration = (Date.now() - startTime) / 1000;

  return {
    totalRequests: results.length,
    successfulRequests: successful.length,
    failedRequests: failed.length,
    errorRate: (failed.length / results.length) * 100,
    avgLatencyMs: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    p50LatencyMs: latencies[Math.floor(latencies.length * 0.5)] ?? 0,
    p95LatencyMs: latencies[Math.floor(latencies.length * 0.95)] ?? 0,
    p99LatencyMs: latencies[Math.floor(latencies.length * 0.99)] ?? 0,
    minLatencyMs: latencies[0] ?? 0,
    maxLatencyMs: latencies[latencies.length - 1] ?? 0,
    requestsPerSecond: results.length / duration,
    durationSeconds: duration,
  };
}

// ── Main ───────────────────────────────────────────────────────

async function main() {
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  MUSHIN 2.0 — API Load Test');
  console.log('══════════════════════════════════════════════════════════════');

  // Test endpoints
  const endpoints = [
    { path: '/health', name: 'Health Check' },
    { path: '/api/workspace', name: 'Workspace API' },
    { path: '/api/search', name: 'Search API' },
  ];

  const allResults: Record<string, LoadTestResult> = {};

  for (const endpoint of endpoints) {
    const result = await runLoadTest(endpoint.path, CONCURRENT, DURATION_SEC);
    allResults[endpoint.name] = result;

    console.log(`📊 ${endpoint.name}:`);
    console.log(`   Total: ${result.totalRequests} | Success: ${result.successfulRequests} | Failed: ${result.failedRequests}`);
    console.log(`   Error Rate: ${result.errorRate.toFixed(2)}%`);
    console.log(`   Latency — Avg: ${result.avgLatencyMs.toFixed(0)}ms | P50: ${result.p50LatencyMs}ms | P95: ${result.p95LatencyMs}ms | P99: ${result.p99LatencyMs}ms`);
    console.log(`   Throughput: ${result.requestsPerSecond.toFixed(1)} req/s`);
    console.log('');
  }

  // Summary
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('══════════════════════════════════════════════════════════════');

  const totalRequests = Object.values(allResults).reduce((sum, r) => sum + r.totalRequests, 0);
  const totalErrors = Object.values(allResults).reduce((sum, r) => sum + r.failedRequests, 0);
  const avgP95 = Object.values(allResults).reduce((sum, r) => sum + r.p95LatencyMs, 0) / Object.values(allResults).length;

  console.log(`Total Requests: ${totalRequests}`);
  console.log(`Total Errors: ${totalErrors}`);
  console.log(`Overall Error Rate: ${((totalErrors / totalRequests) * 100).toFixed(2)}%`);
  console.log(`Average P95 Latency: ${avgP95.toFixed(0)}ms`);
  console.log('');

  // SLO Check
  const p95Target = 500; // ms
  const errorRateTarget = 1; // %

  const overallErrorRate = (totalErrors / totalRequests) * 100;
  const sloPass = avgP95 <= p95Target && overallErrorRate <= errorRateTarget;

  if (sloPass) {
    console.log('✅ SLO CHECK: PASS (P95 < 500ms, Error Rate < 1%)');
  } else {
    console.log('❌ SLO CHECK: FAIL');
    if (avgP95 > p95Target) console.log(`   P95 latency ${avgP95.toFixed(0)}ms exceeds target ${p95Target}ms`);
    if (overallErrorRate > errorRateTarget) console.log(`   Error rate ${overallErrorRate.toFixed(2)}% exceeds target ${errorRateTarget}%`);
  }
}

main().catch(console.error);
