/**
 * Shared adapter types.
 */

export interface AdapterHealthReport {
  status: 'healthy' | 'degraded' | 'unavailable';
  latencyMs: number;
  lastChecked: string;
  circuitStatus: 'closed' | 'open' | 'half-open';
}
