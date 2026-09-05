// Event envelope and payload types
export {
  type EventEnvelope,
  type DiscoveryJobQueuedPayload,
  type DiscoveryStageCompletedPayload,
  type DiscoveryJobCompletedPayload,
  type DiscoveryJobFailedPayload,
  type CreditReservedPayload,
  type CreditCommittedPayload,
  type CreditReleasedPayload,
} from './envelope.js';

// Taxonomy (Doc 16 Part B) — single source of truth for event types
export {
  EVENT_TYPES,
  type EventType,
  type ScopeClass,
  type ActorType,
  EVENT_SCOPE_MAP,
} from './taxonomy.js';

// Emission helpers (ADR-020)
export { emitEvent, isEventProcessed, markEventProcessed } from './emit.js';

// Outbox Relay (ADR-020)
export {
  OutboxRelay,
  createOutboxRelay,
  type OutboxEvent,
  type RelayConfig,
  type QueuePublisher,
  type RelayMetrics,
} from './relay.js';

// SQS Publisher (concrete QueuePublisher implementation)
export {
  SQSPublisher,
  InMemoryPublisher,
  createSQSPublisher,
} from './publisher.js';
