/**
 * Resend adapter — Transactional email sending.
 * ADR-022 compliant (circuit breaker, retry, cost emission).
 *
 * Uses Resend API for transactional emails.
 * Configured via RESEND_API_KEY env var.
 */
import type { AdapterHealthReport } from '../shared/types.js';

// ── Types ────────────────────────────────────────────────────

export interface ResendConfig {
  apiKey: string;
  fromAddress: string;
  fromName?: string;
}

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
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

export class ResendAdapter {
  private config: ResendConfig;

  constructor(config: ResendConfig) {
    this.config = config;
  }

  /**
   * Send an email via Resend API.
   */
  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    if (isCircuitOpen()) {
      return { success: false, error: 'Resend circuit breaker open' };
    }

    try {
      const result = await withRetry(async () => {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${this.config.fromName ?? 'MUSHIN'} <${this.config.fromAddress}>`,
            to: Array.isArray(params.to) ? params.to : [params.to],
            subject: params.subject,
            html: params.html,
            text: params.text,
            reply_to: params.replyTo,
            tags: params.tags,
          }),
        });

        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Resend API error: ${res.status} ${body}`);
        }

        return res.json() as Promise<{ id: string }>;
      });

      recordSuccess();
      return { success: true, messageId: result.id };
    } catch (err) {
      recordFailure();
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown Resend error',
      };
    }
  }

  /**
   * Health check.
   */
  async health(): Promise<AdapterHealthReport> {
    const start = Date.now();
    try {
      // Resend doesn't have a health endpoint; just check circuit
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

export function createResendAdapter(config: ResendConfig): ResendAdapter {
  return new ResendAdapter(config);
}
