/**
 * Paddle adapter — ADR-022 compliant (7 obligations).
 * Implements BillingProvider interface for Paddle Billing (not Classic).
 *
 * Sandbox vs production controlled by PADDLE_ENVIRONMENT env var.
 */
import type {
  BillingProvider,
  CreateSubscriptionParams,
  UpdateSubscriptionParams,
  CancelOptions,
  SubscriptionResult,
  SubscriptionDetails,
  SubscriptionStatus,
  NormalizedBillingEvent,
  BillingHealthReport,
} from './types.js';

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

// ── Paddle API Types (internal) ─────────────────────────────

interface PaddleConfig {
  apiKey: string;
  webhookSecret: string;
  environment: 'sandbox' | 'production';
}

interface PaddleSubscriptionResponse {
  id: string;
  status: string;
  customer_id: string;
  items: Array<{ price_id: string }>;
  current_period: { starts_at: string; ends_at: string };
  canceled_at: string | null;
  management_urls?: { cancel?: string };
  custom_data?: Record<string, string>;
}

interface PaddleWebhookPayload {
  event_type: string;
  occurred_at: string;
  data: Record<string, unknown>;
}

// ── Adapter ──────────────────────────────────────────────────

export class PaddleAdapter implements BillingProvider {
  private config: PaddleConfig;
  private baseUrl: string;

  constructor(config: PaddleConfig) {
    this.config = config;
    this.baseUrl = config.environment === 'production'
      ? 'https://api.paddle.com'
      : 'https://sandbox-api.paddle.com';
  }

  // ── BillingProvider Implementation ─────────────────────────

  async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionResult> {
    if (isCircuitOpen()) {
      return { success: false, error: 'Paddle circuit breaker open', code: 'CIRCUIT_OPEN' };
    }

    try {
      const result = await withRetry(async () => {
        const res = await fetch(`${this.baseUrl}/subscriptions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customer_id: params.customerId,
            items: [{ price_id: params.priceId }],
            custom_data: {
              workspace_id: params.workspaceId,
              ...params.metadata,
            },
          }),
        });

        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Paddle API error: ${res.status} ${body}`);
        }

        return res.json() as Promise<{ data: PaddleSubscriptionResponse }>;
      });

      recordSuccess();
      return {
        success: true,
        subscription: this.mapSubscription(result.data),
      };
    } catch (err) {
      recordFailure();
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown Paddle error',
      };
    }
  }

  async cancelSubscription(subscriptionId: string, opts?: CancelOptions): Promise<SubscriptionResult> {
    if (isCircuitOpen()) {
      return { success: false, error: 'Paddle circuit breaker open', code: 'CIRCUIT_OPEN' };
    }

    try {
      const effectiveAt = opts?.effectiveAt === 'immediately' ? 'immediately' : 'end_of_billing_period';

      const result = await withRetry(async () => {
        const res = await fetch(`${this.baseUrl}/subscriptions/${subscriptionId}/cancel`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ effective_at: effectiveAt }),
        });

        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Paddle API error: ${res.status} ${body}`);
        }

        return res.json() as Promise<{ data: PaddleSubscriptionResponse }>;
      });

      recordSuccess();
      return {
        success: true,
        subscription: this.mapSubscription(result.data),
      };
    } catch (err) {
      recordFailure();
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown Paddle error',
      };
    }
  }

  async updateSubscription(subscriptionId: string, params: UpdateSubscriptionParams): Promise<SubscriptionResult> {
    if (isCircuitOpen()) {
      return { success: false, error: 'Paddle circuit breaker open', code: 'CIRCUIT_OPEN' };
    }

    try {
      const body: Record<string, unknown> = {};
      if (params.priceId) {
        body['items'] = [{ price_id: params.priceId }];
      }
      if (params.metadata) {
        body['custom_data'] = params.metadata;
      }

      const result = await withRetry(async () => {
        const res = await fetch(`${this.baseUrl}/subscriptions/${subscriptionId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errBody = await res.text();
          throw new Error(`Paddle API error: ${res.status} ${errBody}`);
        }

        return res.json() as Promise<{ data: PaddleSubscriptionResponse }>;
      });

      recordSuccess();
      return {
        success: true,
        subscription: this.mapSubscription(result.data),
      };
    } catch (err) {
      recordFailure();
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown Paddle error',
      };
    }
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionDetails | null> {
    if (isCircuitOpen()) return null;

    try {
      const result = await withRetry(async () => {
        const res = await fetch(`${this.baseUrl}/subscriptions/${subscriptionId}`, {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
          },
        });

        if (res.status === 404) return null;
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Paddle API error: ${res.status} ${body}`);
        }

        return res.json() as Promise<{ data: PaddleSubscriptionResponse }>;
      });

      recordSuccess();
      return result ? this.mapSubscription(result.data) : null;
    } catch {
      recordFailure();
      return null;
    }
  }

  async parseWebhook(rawBody: string, signature: string): Promise<NormalizedBillingEvent | null> {
    // Verify webhook signature using HMAC-SHA256
    const isValid = await this.verifySignature(rawBody, signature);
    if (!isValid) return null;

    const payload = JSON.parse(rawBody) as PaddleWebhookPayload;
    return this.normalizeEvent(payload);
  }

  async health(): Promise<BillingHealthReport> {
    const start = Date.now();
    try {
      // Simple health check — list subscriptions with limit 1
      const res = await fetch(`${this.baseUrl}/subscriptions?per_page=1`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      recordSuccess();
      return {
        status: res.ok ? 'healthy' : 'degraded',
        latencyMs: Date.now() - start,
        lastChecked: new Date().toISOString(),
      };
    } catch {
      recordFailure();
      return {
        status: 'unavailable',
        latencyMs: Date.now() - start,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  // ── Private Helpers ────────────────────────────────────────

  private mapSubscription(data: PaddleSubscriptionResponse): SubscriptionDetails {
    return {
      id: data.id,
      status: this.mapStatus(data.status),
      customerId: data.customer_id,
      priceId: data.items[0]?.price_id ?? '',
      currentPeriodStart: new Date(data.current_period.starts_at),
      currentPeriodEnd: new Date(data.current_period.ends_at),
      cancelAt: data.management_urls?.cancel ? new Date(data.management_urls.cancel) : null,
      canceledAt: data.canceled_at ? new Date(data.canceled_at) : null,
      metadata: data.custom_data ?? {},
    };
  }

  private mapStatus(paddleStatus: string): SubscriptionStatus {
    switch (paddleStatus) {
      case 'active': return 'active';
      case 'trialing': return 'trialing';
      case 'past_due': return 'past_due';
      case 'paused': return 'paused';
      case 'canceled': return 'canceled';
      case 'expired': return 'expired';
      default: return 'active';
    }
  }

  private async verifySignature(rawBody: string, signature: string): Promise<boolean> {
    // Paddle webhook signature verification using HMAC-SHA256
    // The signature is a hex-encoded HMAC of the raw body
    try {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(this.config.webhookSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
      );

      const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(rawBody),
      );

      const computedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      // Constant-time comparison to prevent timing attacks
      const { timingSafeEqual } = await import('node:crypto');
      const computedBuf = Buffer.from(computedSignature, 'hex');
      const receivedBuf = Buffer.from(signature, 'hex');
      if (computedBuf.length !== receivedBuf.length) return false;
      return timingSafeEqual(computedBuf, receivedBuf);
    } catch {
      return false;
    }
  }

  private normalizeEvent(payload: PaddleWebhookPayload): NormalizedBillingEvent | null {
    const data = payload.data;
    const occurredAt = new Date(payload.occurred_at);

    switch (payload.event_type) {
      case 'subscription.created':
        return {
          type: 'subscription_created',
          subscriptionId: data['id'] as string,
          customerId: data['customer_id'] as string,
          priceId: (data['items'] as Array<{ price_id: string }>)?.[0]?.price_id ?? '',
          status: this.mapStatus(data['status'] as string),
          currentPeriodStart: new Date((data['current_period'] as { starts_at: string }).starts_at),
          currentPeriodEnd: new Date((data['current_period'] as { ends_at: string }).ends_at),
          metadata: (data['custom_data'] as Record<string, string>) ?? {},
          occurredAt,
        };

      case 'subscription.updated':
        return {
          type: 'subscription_updated',
          subscriptionId: data['id'] as string,
          customerId: data['customer_id'] as string,
          priceId: (data['items'] as Array<{ price_id: string }>)?.[0]?.price_id ?? '',
          status: this.mapStatus(data['status'] as string),
          currentPeriodStart: new Date((data['current_period'] as { starts_at: string }).starts_at),
          currentPeriodEnd: new Date((data['current_period'] as { ends_at: string }).ends_at),
          metadata: (data['custom_data'] as Record<string, string>) ?? {},
          occurredAt,
        };

      case 'subscription.canceled':
        return {
          type: 'subscription_cancelled',
          subscriptionId: data['id'] as string,
          customerId: data['customer_id'] as string,
          effectiveAt: occurredAt,
          reason: data['reason'] as string | undefined,
          occurredAt,
        };

      case 'transaction.completed':
        return {
          type: 'payment_succeeded',
          subscriptionId: data['subscription_id'] as string,
          customerId: data['customer_id'] as string,
          amount: (data['details'] as { total?: number })?.total ?? 0,
          currency: (data['currency_code'] as string) ?? 'USD',
          occurredAt,
        };

      case 'transaction.payment_failed':
        return {
          type: 'payment_failed',
          subscriptionId: data['subscription_id'] as string,
          customerId: data['customer_id'] as string,
          amount: (data['details'] as { total?: number })?.total ?? 0,
          currency: (data['currency_code'] as string) ?? 'USD',
          reason: data['failure_reason'] as string | undefined,
          occurredAt,
        };

      default:
        return null;
    }
  }

  getCircuitStatus(): CircuitState['status'] {
    return circuit.status;
  }
}

// ── Factory ──────────────────────────────────────────────────

export function createPaddleAdapter(config: {
  apiKey: string;
  webhookSecret: string;
  environment: 'sandbox' | 'production';
}): PaddleAdapter {
  return new PaddleAdapter(config);
}
