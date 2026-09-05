/**
 * Platform Schema — System infrastructure (Doc 19 Part K).
 * Tables: outbox, processed_event_ledger.
 */
import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  primaryKey,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { scopeClassEnum } from '../enums/index.js';

// ── platform.outbox (ADR-020) ────────────────────────────────

export const outbox = pgTable(
  'outbox',
  {
    outboxId: uuid('outbox_id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').notNull().defaultRandom(),
    eventType: text('event_type').notNull(),
    schemaVersion: text('schema_version').notNull().default('1'),
    scopeClass: scopeClassEnum('scope_class').notNull(),
    workspaceId: uuid('workspace_id'),
    // NULL for GCP and platform scope events
    actorType: text('actor_type'),
    actorId: text('actor_id'),
    correlationId: uuid('correlation_id'),
    causationId: uuid('causation_id'),
    payload: jsonb('payload').notNull().default('{}'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    dispatchedAt: timestamp('dispatched_at', { withTimezone: true }),
    // NULL = pending dispatch; set by relay on successful queue publish
    dispatchAttempts: integer('dispatch_attempts').notNull().default(0),
  },
  (table) => [
    // Unique event ID for idempotency
    unique('uq_outbox_event_id').on(table.eventId),
    // Relay query: FOR UPDATE SKIP LOCKED pattern (ADR-020)
    index('idx_outbox_pending')
      .on(table.createdAt)
      .where(sql`${table.dispatchedAt} IS NULL`),
  ],
);

// ── platform.processed_event_ledger (ADR-020, Doc 16 A3) ────

export const processedEventLedger = pgTable(
  'processed_event_ledger',
  {
    consumerGroup: text('consumer_group').notNull(),
    // Format: '{module_id}:{event_type}' e.g. 'M10:billing.webhook_received'
    eventId: uuid('event_id').notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.consumerGroup, table.eventId] }),
  ],
);

// ── platform.audit_log (DOC-029 §2.2) ───────────────────────
// Immutable, append-only audit trail for all staff actions.
// Corrections are new records, not mutations.

export const auditLog = pgTable(
  'audit_log',
  {
    auditId: uuid('audit_id').primaryKey().defaultRandom(),
    staffUserId: uuid('staff_user_id').notNull(),
    staffRole: text('staff_role').notNull(),
    action: text('action').notNull(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    workspaceId: uuid('workspace_id'),
    reason: text('reason'),
    ticketRef: text('ticket_ref'),
    requestId: text('request_id').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    details: jsonb('details'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_audit_log_staff').on(table.staffUserId, table.occurredAt),
    index('idx_audit_log_action').on(table.action, table.occurredAt),
    index('idx_audit_log_workspace').on(table.workspaceId, table.occurredAt),
    index('idx_audit_log_request').on(table.requestId),
  ],
);
