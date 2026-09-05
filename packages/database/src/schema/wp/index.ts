/**
 * WP Schema — Workspace Plane (Doc 19 Part E, F, G, H, I).
 * Tables: workspace, membership, workspace_credit_balance,
 *          credit_ledger_entry (partitioned), workspace_creator_link,
 *          list, list_member, interaction_timeline (partitioned).
 *
 * Partitioned tables (credit_ledger_entry, interaction_timeline) are defined
 * for type generation only. Inserts use raw SQL since Drizzle doesn't handle
 * PostgreSQL range partition routing.
 */
import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  bigint,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  unique,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/pg-core';
import {
  subscriptionStateEnum,
  memberRoleEnum,
  membershipStatusEnum,
  ledgerEntryTypeEnum,
} from '../enums/index.js';

// ── wp.workspace ─────────────────────────────────────────────

export const workspace = pgTable(
  'workspace',
  {
    workspaceId: uuid('workspace_id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    logoUrl: text('logo_url'),
    defaultTimezone: text('default_timezone').notNull().default('Asia/Karachi'),
    defaultCurrency: text('default_currency').notNull().default('PKR'),

    // Billing state (driven exclusively by Paddle webhooks, FS-08.02)
    subscriptionState: subscriptionStateEnum('subscription_state').notNull().default('trialing'),
    subscriptionPlanId: text('subscription_plan_id'),
    subscriptionPaddleId: text('subscription_paddle_id'),
    paddleCustomerId: text('paddle_customer_id'),

    // Entitlement snapshot invalidation key (Doc 10 A2)
    entitlementSnapshotVersion: integer('entitlement_snapshot_version').notNull().default(0),

    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_workspace_slug').on(table.slug),
    index('idx_workspace_paddle_sub')
      .on(table.subscriptionPaddleId)
      .where(sql`${table.subscriptionPaddleId} IS NOT NULL`),
  ],
);

// ── wp.membership ────────────────────────────────────────────

export const membership = pgTable(
  'membership',
  {
    membershipId: uuid('membership_id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull()
      .references(() => workspace.workspaceId, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    // Soft FK to managed auth (not enforced - mirrors BaaS identity)
    role: memberRoleEnum('role').notNull().default('member'),
    status: membershipStatusEnum('status').notNull().default('pending_invite'),
    invitedEmail: text('invited_email'),
    invitedAt: timestamp('invited_at', { withTimezone: true }).notNull().defaultNow(),
    joinedAt: timestamp('joined_at', { withTimezone: true }),
    removedAt: timestamp('removed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('uq_membership').on(table.workspaceId, table.userId),
    index('idx_membership_user').on(table.userId),
    index('idx_membership_workspace').on(table.workspaceId),
  ],
);

// ── wp.workspace_credit_balance (ADR-026) ────────────────────

export const workspaceCreditBalance = pgTable(
  'workspace_credit_balance',
  {
    workspaceId: uuid('workspace_id').primaryKey()
      .references(() => workspace.workspaceId, { onDelete: 'cascade' }),
    balance: bigint('balance', { mode: 'bigint' }).notNull().default(0n),
    version: integer('version').notNull().default(1),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
);

// ── wp.credit_ledger_entry (PARTITIONED — type generation only) ──
// Inserts MUST use raw SQL since Drizzle doesn't handle partition routing.

export const creditLedgerEntry = pgTable(
  'credit_ledger_entry',
  {
    entryId: uuid('entry_id').notNull().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),
    entryType: ledgerEntryTypeEnum('entry_type').notNull(),
    amount: bigint('amount', { mode: 'bigint' }).notNull(),
    referenceType: text('reference_type'),
    referenceId: uuid('reference_id'),
    providerCostSnapshot: jsonb('provider_cost_snapshot'),
    period: text('period'),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Composite PK for partitioning
    primaryKey({ columns: [table.entryId, table.createdAt] }),
    // Indexes
    index('idx_credit_ledger_workspace').on(table.workspaceId, table.createdAt),
    index('idx_credit_ledger_type').on(table.entryType, table.createdAt),
    index('idx_credit_ledger_reference')
      .on(table.referenceType, table.referenceId)
      .where(sql`${table.referenceType} IS NOT NULL`),
  ],
);

// ── wp.workspace_creator_link — THE GCP/WP BRIDGE (ADR-024) ─

export const workspaceCreatorLink = pgTable(
  'workspace_creator_link',
  {
    linkId: uuid('link_id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull()
      .references(() => workspace.workspaceId, { onDelete: 'cascade' }),
    creatorId: uuid('creator_id').notNull(),
    // Soft FK to gcp.creator. No DB-level FK (ADR-024).
    addedBy: uuid('added_by'),
    tags: text('tags').array().default([]),
    firstLinkedAt: timestamp('first_linked_at', { withTimezone: true }).notNull().defaultNow(),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }).notNull().defaultNow(),
    workspaceRemovedAt: timestamp('workspace_removed_at', { withTimezone: true }),
    piiDeletedAt: timestamp('pii_deleted_at', { withTimezone: true }),
  },
  (table) => [
    unique('uq_ws_creator_link').on(table.workspaceId, table.creatorId),
    index('idx_wcl_workspace').on(table.workspaceId),
    index('idx_wcl_creator').on(table.creatorId),
    index('idx_wcl_active')
      .on(table.workspaceId, table.lastActiveAt)
      .where(sql`${table.workspaceRemovedAt} IS NULL`),
  ],
);

// ── wp.list ──────────────────────────────────────────────────

export const list = pgTable(
  'list',
  {
    listId: uuid('list_id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull()
      .references(() => workspace.workspaceId, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    visibility: text('visibility').notNull().default('workspace'),
    createdBy: uuid('created_by'),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_list_workspace')
      .on(table.workspaceId)
      .where(sql`${table.archivedAt} IS NULL`),
  ],
);

// ── wp.list_member ───────────────────────────────────────────

export const listMember = pgTable(
  'list_member',
  {
    listMemberId: uuid('list_member_id').primaryKey().defaultRandom(),
    listId: uuid('list_id').notNull()
      .references(() => list.listId, { onDelete: 'cascade' }),
    workspaceCreatorLinkId: uuid('workspace_creator_link_id').notNull()
      .references(() => workspaceCreatorLink.linkId, { onDelete: 'cascade' }),
    addedBy: uuid('added_by'),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
    removedAt: timestamp('removed_at', { withTimezone: true }),
    notes: text('notes'),
  },
  (table) => [
    unique('uq_list_member_active').on(table.listId, table.workspaceCreatorLinkId, table.removedAt),
    index('idx_list_member_list')
      .on(table.listId)
      .where(sql`${table.removedAt} IS NULL`),
    index('idx_list_member_wcl').on(table.workspaceCreatorLinkId),
  ],
);

// ── wp.interaction_timeline (PARTITIONED — type generation only) ──
// Inserts MUST use raw SQL since Drizzle doesn't handle partition routing.

export const interactionTimeline = pgTable(
  'interaction_timeline',
  {
    entryId: uuid('entry_id').notNull().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),
    workspaceCreatorLinkId: uuid('workspace_creator_link_id').notNull(),
    eventType: text('event_type').notNull(),
    actorType: text('actor_type').notNull().default('system'),
    actorId: text('actor_id').notNull().default('system'),
    channel: text('channel'),
    campaignId: uuid('campaign_id'),
    sequenceEnrollmentId: uuid('sequence_enrollment_id'),
    payload: jsonb('payload').notNull().default({}),
    sourceEventId: uuid('source_event_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.entryId, table.createdAt] }),
    index('idx_timeline_workspace').on(table.workspaceId, table.createdAt),
    index('idx_timeline_wcl').on(table.workspaceCreatorLinkId, table.createdAt),
    index('idx_timeline_event_type').on(table.eventType, table.createdAt),
    index('idx_timeline_campaign')
      .on(table.workspaceId, table.campaignId, table.createdAt)
      .where(sql`${table.campaignId} IS NOT NULL`),
    index('idx_timeline_enrollment')
      .on(table.sequenceEnrollmentId)
      .where(sql`${table.sequenceEnrollmentId} IS NOT NULL`),
  ],
);

// ── wp.paddle_webhook_raw ─────────────────────────────────────
// Raw webhook storage for idempotency and audit trail.

export const paddleWebhookRaw = pgTable(
  'paddle_webhook_raw',
  {
    webhookId: uuid('webhook_id').primaryKey().defaultRandom(),
    paddleEventId: text('paddle_event_id').unique().notNull(),
    eventType: text('event_type').notNull(),
    rawPayload: jsonb('raw_payload').notNull(),
    signature: text('signature').notNull(),
    verified: boolean('verified').notNull().default(false),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    processingError: text('processing_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_paddle_webhook_pending')
      .on(table.createdAt)
      .where(sql`${table.processedAt} IS NULL`),
    index('idx_paddle_webhook_event_type').on(table.eventType, table.createdAt),
  ],
);

// ── wp.subscription_event ─────────────────────────────────────
// Normalized billing events. Immutable, append-only.

export const subscriptionEvent = pgTable(
  'subscription_event',
  {
    eventId: uuid('event_id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull()
      .references(() => workspace.workspaceId, { onDelete: 'cascade' }),
    subscriptionId: text('subscription_id').notNull(),
    eventType: text('event_type').notNull(),
    status: text('status'),
    priceId: text('price_id'),
    customerId: text('customer_id'),
    amount: bigint('amount', { mode: 'bigint' }),
    currency: text('currency').default('USD'),
    metadata: jsonb('metadata').default({}),
    paddleEventId: text('paddle_event_id'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_subscription_event_workspace').on(table.workspaceId, table.createdAt),
    index('idx_subscription_event_sub').on(table.subscriptionId, table.createdAt),
    index('idx_subscription_event_type').on(table.eventType, table.createdAt),
  ],
);

// ── wp.feedback_report (DOC-030) ─────────────────────────────
// User-submitted feedback: bug reports, feature requests, data corrections.

export const feedbackReport = pgTable(
  'feedback_report',
  {
    reportId: uuid('report_id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull()
      .references(() => workspace.workspaceId, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    reportType: text('report_type').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    creatorId: uuid('creator_id'),
    pageUrl: text('page_url'),
    attachmentUrl: text('attachment_url'),
    priorityScore: integer('priority_score').notNull().default(0),
    status: text('status').notNull().default('open'),
    resolutionNotes: text('resolution_notes'),
    resolvedBy: uuid('resolved_by'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_feedback_workspace').on(table.workspaceId, table.createdAt),
    index('idx_feedback_type').on(table.reportType, table.status),
  ],
);

// ── wp.support_ticket (DOC-030) ──────────────────────────────
// Support tickets derived from feedback or direct submission.

export const supportTicket = pgTable(
  'support_ticket',
  {
    ticketId: uuid('ticket_id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull()
      .references(() => workspace.workspaceId, { onDelete: 'cascade' }),
    reportId: uuid('report_id'),
    userId: uuid('user_id').notNull(),
    ticketType: text('ticket_type').notNull().default('feedback'),
    subject: text('subject').notNull(),
    description: text('description').notNull(),
    priority: text('priority').notNull().default('medium'),
    status: text('status').notNull().default('open'),
    assignedTo: uuid('assigned_to'),
    resolution: text('resolution'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_ticket_workspace').on(table.workspaceId, table.status),
    index('idx_ticket_status').on(table.status, table.createdAt),
  ],
);

// ── wp.admin_review_queue (DOC-030) ──────────────────────────
// Admin review queue for flagged items.

export const adminReviewQueue = pgTable(
  'admin_review_queue',
  {
    queueId: uuid('queue_id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull()
      .references(() => workspace.workspaceId, { onDelete: 'cascade' }),
    itemType: text('item_type').notNull(),
    itemId: uuid('item_id').notNull(),
    reason: text('reason').notNull(),
    priorityScore: integer('priority_score').notNull().default(50),
    status: text('status').notNull().default('pending'),
    reviewedBy: uuid('reviewed_by'),
    reviewNotes: text('review_notes'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_review_queue_workspace').on(table.workspaceId, table.status),
  ],
);

// ── wp.reveal (Contact Reveal Records) ───────────────────────
// Tracks workspace-level contact reveals for creators.
// Per ADR-029: once revealed, no additional charge for same workspace.
// Per DOC-029: minor_signal creators cannot be revealed.

export const reveal = pgTable(
  'reveal',
  {
    revealId: uuid('reveal_id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull()
      .references(() => workspace.workspaceId, { onDelete: 'cascade' }),
    creatorId: uuid('creator_id').notNull(),
    creditCost: bigint('credit_cost', { mode: 'bigint' }).notNull().default(5n),
    revealedBy: uuid('revealed_by').notNull(),
    revealedAt: timestamp('revealed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('uq_reveal_workspace_creator').on(table.workspaceId, table.creatorId),
    index('idx_reveal_workspace').on(table.workspaceId),
    index('idx_reveal_creator').on(table.creatorId),
  ],
);

// ── wp.staff_user (Staff Identity) ───────────────────────────
// Staff profile table extending Supabase Auth identity.
// Staff identities live in a separate auth realm (ADR-011).

export const staffUser = pgTable(
  'staff_user',
  {
    staffUserId: uuid('staff_user_id').primaryKey(),
    displayName: text('display_name').notNull(),
    department: text('department'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_staff_user_department').on(table.department),
  ],
);
