export {
  PaddleAdapter,
  createPaddleAdapter,
} from './adapter.js';

export type {
  BillingProvider,
  CreateSubscriptionParams,
  UpdateSubscriptionParams,
  CancelOptions,
  SubscriptionResult,
  SubscriptionDetails,
  SubscriptionStatus,
  NormalizedBillingEvent,
  SubscriptionCreatedEvent,
  SubscriptionUpdatedEvent,
  SubscriptionCancelledEvent,
  PaymentSucceededEvent,
  PaymentFailedEvent,
  BillingHealthReport,
} from './types.js';
