/**
 * Event Taxonomy (Doc 16 Part B).
 * All event type strings as typed constants, organized by family.
 */
export const EVENT_TYPES = {
  // ── Creator Family (GCP scope) ─────────────────────────────
  CREATOR_DISCOVERED: 'creator.discovered',
  CREATOR_ENRICHED: 'creator.enriched',
  CREATOR_SCORED: 'creator.scored',
  CREATOR_REFRESH_COMPLETED: 'creator.refresh_completed',
  CREATOR_MERGE_RESOLVED: 'creator.merge_resolved',
  CREATOR_ERASED: 'creator.erased',

  // ── Discovery Family (GCP + WP scope) ─────────────────────
  DISCOVERY_JOB_QUEUED: 'discovery.job_queued',
  DISCOVERY_STAGE_COMPLETED: 'discovery.stage_completed',
  DISCOVERY_JOB_COMPLETED: 'discovery.job_completed',
  DISCOVERY_JOB_FAILED: 'discovery.job_failed',

  // ── Workspace Family (WP scope) ───────────────────────────
  WORKSPACE_CREATED: 'workspace.created',
  WORKSPACE_MEMBER_INVITED: 'workspace.member_invited',
  WORKSPACE_MEMBER_JOINED: 'workspace.member_joined',
  WORKSPACE_MEMBER_REMOVED: 'workspace.member_removed',
  WORKSPACE_SETTINGS_CHANGED: 'workspace.settings_changed',

  // ── List Family (WP scope) ────────────────────────────────
  LIST_CREATED: 'list.created',
  LIST_ARCHIVED: 'list.archived',
  LIST_MEMBERSHIP_CHANGED: 'list.membership_changed',
  LIST_NOTE_ADDED: 'list.note_added',
  LIST_EXPORTED: 'list.exported',

  // ── Campaign Family (WP scope) ────────────────────────────
  CAMPAIGN_CREATED: 'campaign.created',
  CAMPAIGN_ARCHIVED: 'campaign.archived',
  CAMPAIGN_STAGE_CHANGED: 'campaign.stage_changed',
  CAMPAIGN_TASK_COMPLETED: 'campaign.task_completed',
  CAMPAIGN_RATE_RECORDED: 'campaign.rate_recorded',
  CAMPAIGN_OUTCOME_RECORDED: 'campaign.outcome_recorded',
  CAMPAIGN_BUDGET_THRESHOLD_CROSSED: 'campaign.budget_threshold_crossed',

  // ── Outreach Family (WP scope) ────────────────────────────
  OUTREACH_MESSAGE_SENT: 'outreach.message_sent',
  OUTREACH_MESSAGE_DELIVERED: 'outreach.message_delivered',
  OUTREACH_MESSAGE_FAILED: 'outreach.message_failed',
  OUTREACH_REPLY_RECEIVED: 'outreach.reply_received',
  OUTREACH_OPENED: 'outreach.opened',
  OUTREACH_OPTOUT_RECORDED: 'outreach.optout_recorded',
  OUTREACH_SEQUENCE_ENROLLED: 'outreach.sequence_enrolled',
  OUTREACH_SEQUENCE_STEP_EXECUTED: 'outreach.sequence_step_executed',
  OUTREACH_SEQUENCE_STOPPED: 'outreach.sequence_stopped',
  OUTREACH_MAILBOX_REVOKED: 'outreach.mailbox_revoked',
  OUTREACH_WHATSAPP_QUALITY_CHANGED: 'outreach.whatsapp_quality_changed',

  // ── Billing Family (WP scope) ─────────────────────────────
  BILLING_WEBHOOK_RECEIVED: 'billing.webhook_received',
  BILLING_SUBSCRIPTION_STATE_CHANGED: 'billing.subscription_state_changed',
  BILLING_PLAN_CHANGED: 'billing.plan_changed',
  BILLING_RECONCILIATION_HEALED: 'billing.reconciliation_healed',

  // ── Credit Family (WP scope) ──────────────────────────────
  CREDIT_GRANTED: 'credit.granted',
  CREDIT_RESERVED: 'credit.reserved',
  CREDIT_COMMITTED: 'credit.committed',
  CREDIT_RELEASED: 'credit.released',
  CREDIT_REVERSED: 'credit.reversed',
  CREDIT_BALANCE_THRESHOLD_CROSSED: 'credit.balance_threshold_crossed',

  // ── Reveal Family (WP scope) ──────────────────────────────
  REVEAL_CONTACT_REVEALED: 'reveal.contact_revealed',

  // ── Admin Family (WP + staff scope) ───────────────────────
  ADMIN_IMPERSONATION_STARTED: 'admin.impersonation_started',
  ADMIN_IMPERSONATION_ENDED: 'admin.impersonation_ended',
  ADMIN_FLAG_CHANGED: 'admin.flag_changed',
  ADMIN_WORKSPACE_SUSPENDED: 'admin.workspace_suspended',

  // ── Cost Family (Platform scope) ──────────────────────────
  COST_RECORDED: 'cost.recorded',

  // ── Feedback Family (WP scope) ────────────────────────────
  FEEDBACK_REPORT_SUBMITTED: 'feedback.report_submitted',
  FEEDBACK_REPORT_RESOLVED: 'feedback.report_resolved',
  FEEDBACK_TIMELINE_ENTRY: 'feedback.timeline_entry',
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

/**
 * Event scope class (Doc 16 A1).
 */
export type ScopeClass = 'gcp' | 'wp' | 'platform';

/**
 * Actor types (Doc 16 A1).
 */
export type ActorType = 'user' | 'system' | 'ai' | 'staff_impersonated';

/**
 * Event family → scope class mapping.
 */
export const EVENT_SCOPE_MAP: Record<string, ScopeClass> = {
  creator: 'gcp',
  discovery: 'gcp',
  workspace: 'wp',
  list: 'wp',
  campaign: 'wp',
  outreach: 'wp',
  billing: 'wp',
  credit: 'wp',
  reveal: 'wp',
  admin: 'wp',
  cost: 'platform',
};
