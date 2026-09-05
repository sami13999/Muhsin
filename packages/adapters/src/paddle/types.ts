/**
 * Billing provider types — provider-agnostic interface for billing operations.
 * Paddle is the first implementation; a second adapter (if A-032 requires)
 * implements the same interface.
 */

// ── Provider Interface ────────────────────────────────────────

export interface BillingProvider {
  /** Create a new subscription for a customer. */
  createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionResult>;

  /** Cancel an existing subscription. */
  cancelSubscription(subscriptionId: string, opts?: CancelOptions): Promise<SubscriptionResult>;

  /** Update subscription (plan change, quantity, etc.). */
  updateSubscription(subscriptionId: string, params: UpdateSubscriptionParams): Promise<SubscriptionResult>;

  /** Get subscription details. */
  getSubscription(subscriptionId: string): Promise<SubscriptionDetails | null>;

  /** Verify and parse a webhook payload. Returns null if signature is invalid. */
  parseWebhook(rawBody: string, signature: string): Promise<NormalizedBillingEvent | null>;

  /** Health check. */
  health(): Promise<BillingHealthReport>;
}

// ── Parameter Types ───────────────────────────────────────────

export interface CreateSubscriptionParams {
  customerId: string;
  priceId: string;
  workspaceId: string;
  metadata?: Record<string, string>;
}

export interface UpdateSubscriptionParams {
  priceId?: string;
  quantity?: number;
  metadata?: Record<string, string>;
}

export interface CancelOptions {
  /** Cancel immediately vs at end of billing period. */
  effectiveAt?: 'immediately' | 'end_of_period';
  reason?: string;
}

// ── Result Types ──────────────────────────────────────────────

export type SubscriptionResult =
  | { success: true; subscription: SubscriptionDetails }
  | { success: false; error: string; code?: string };

export interface SubscriptionDetails {
  id: string;
  status: SubscriptionStatus;
  customerId: string;
  priceId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAt: Date | null;
  canceledAt: Date | null;
  metadata: Record<string, string>;
}

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'paused'
  | 'canceled'
  | 'expired';

// ── Webhook Event Types ───────────────────────────────────────

export type NormalizedBillingEvent =
  | SubscriptionCreatedEvent
  | SubscriptionUpdatedEvent
  | SubscriptionCancelledEvent
  | PaymentSucceededEvent
  | PaymentFailedEvent;

export interface SubscriptionCreatedEvent {
  type: 'subscription_created';
  subscriptionId: string;
  customerId: string;
  priceId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  metadata: Record<string, string>;
  occurredAt: Date;
}

export interface SubscriptionUpdatedEvent {
  type: 'subscription_updated';
  subscriptionId: string;
  customerId: string;
  priceId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  metadata: Record<string, string>;
  occurredAt: Date;
}

export interface SubscriptionCancelledEvent {
  type: 'subscription_cancelled';
  subscriptionId: string;
  customerId: string;
  effectiveAt: Date;
  reason?: string;
  occurredAt: Date;
}

export interface PaymentSucceededEvent {
  type: 'payment_succeeded';
  subscriptionId: string;
  customerId: string;
  amount: number;
  currency: string;
  occurredAt: Date;
}

export interface PaymentFailedEvent {
  type: 'payment_failed';
  subscriptionId: string;
  customerId: string;
  amount: number;
  currency: string;
  reason?: string;
  occurredAt: Date;
}

// ── Health ────────────────────────────────────────────────────

export interface BillingHealthReport {
  status: 'healthy' | 'degraded' | 'unavailable';
  latencyMs: number;
  lastChecked: string;
}
