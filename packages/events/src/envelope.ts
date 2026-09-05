/**
 * Event Envelope (Doc 16 A1).
 * Uniform structure for all domain events in the transactional outbox.
 */
export interface EventEnvelope {
  /** Globally unique event ID — the idempotency key */
  eventId: string;
  /** Event type from taxonomy (e.g. 'discovery.job_queued') */
  type: string;
  /** Schema version for backward compatibility */
  schemaVersion: number;
  /** When the event occurred (never DB insert time) */
  occurredAt: Date;
  /** GCP | WP — determines routing */
  scopeClass: 'GCP' | 'WP';
  /** Workspace UUID — required for WP events, null for GCP */
  workspaceId?: string;
  /** Who/what triggered this event */
  actor: {
    type: 'user' | 'system' | 'staff';
    id: string;
    impersonationContext?: { staffId: string; reason: string };
  };
  /** Links all events in a job/flow */
  correlationId: string;
  /** The triggering event ID */
  causationId?: string;
  /** Event-specific payload */
  payload: Record<string, unknown>;
}

// ── Discovery Events (Doc 16 Part B) ─────────────────────────

export interface DiscoveryJobQueuedPayload {
  jobId: string;
  workspaceId: string;
  jobType: 'live_search' | 'add_by_url' | 'deep_enrichment' | 'refresh';
  queryIntent: Record<string, unknown>;
  candidateCountTarget: number | null;
  correlationId: string;
}

export interface DiscoveryStageCompletedPayload {
  jobId: string;
  stage: string;
  candidatesProcessed: number;
  candidatesSucceeded: number;
  candidatesFailed: number;
}

export interface DiscoveryJobCompletedPayload {
  jobId: string;
  candidateCountScraped: number;
  candidateCountSucceeded: number;
  candidateCountFailed: number;
  creditsCommitted: string;
}

export interface DiscoveryJobFailedPayload {
  jobId: string;
  failureReason: string;
  candidatesProcessedBeforeFailure: number;
}

// ── Credit Events (Doc 16 Part B) ────────────────────────────

export interface CreditReservedPayload {
  reservationId: string;
  workspaceId: string;
  actionType: string;
  actionReferenceId: string;
  amountReserved: string;
}

export interface CreditCommittedPayload {
  reservationId: string;
  workspaceId: string;
  actionType: string;
  actionReferenceId: string;
  amountCommitted: string;
}

export interface CreditReleasedPayload {
  reservationId: string;
  workspaceId: string;
  amountReleased: string;
  reason: 'ttl_expired' | 'job_failed' | 'subscription_expired' | 'released_by_job';
}
