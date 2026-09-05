/**
 * Custom PostgreSQL enum types (Doc 19 Part B).
 * Drizzle pgEnum definitions — these map to CREATE TYPE statements.
 */
import { pgEnum } from 'drizzle-orm/pg-core';

// ── GCP Enums ────────────────────────────────────────────────

export const platformEnum = pgEnum('platform_enum', [
  'instagram',
  'tiktok',
  'youtube',
  'twitter',
  'facebook',
]);

export const enrichmentSourceEnum = pgEnum('enrichment_source_enum', [
  'youtube_data_api_v3',
  'apify_actor',
  'user_submitted',
  'manual_entry',
]);

export const completenessTierEnum = pgEnum('completeness_tier_enum', [
  'rich',
  'standard',
  'sparse',
  'minimal',
]);

export const creatorMergeStatusEnum = pgEnum('creator_merge_status_enum', [
  'active',
  'candidate',
  'merged_into',
]);

export const snapshotTypeEnum = pgEnum('snapshot_type_enum', [
  'authenticity',
  'quality',
  'audience_estimate',
  'summary',
  'niche_classification',
]);

export const confidenceLevelEnum = pgEnum('confidence_level_enum', [
  'high',
  'medium',
  'low',
  'insufficient_data',
]);

export const contactTypeEnum = pgEnum('contact_type_enum', [
  'email',
  'whatsapp_number',
  'website',
  'other',
]);

export const contactSourceEnum = pgEnum('contact_source_enum', [
  'scraped',
  'provider_verified',
  'user_submitted',
]);

// ── WP Enums ─────────────────────────────────────────────────

export const subscriptionStateEnum = pgEnum('subscription_state_enum', [
  'trialing',
  'active',
  'past_due',
  'paused_grace',
  'canceled_pending',
  'expired',
]);

export const memberRoleEnum = pgEnum('member_role_enum', [
  'owner',
  'admin',
  'member',
]);

export const membershipStatusEnum = pgEnum('membership_status_enum', [
  'active',
  'suspended',
  'pending_invite',
  'removed',
]);

export const campaignObjectiveEnum = pgEnum('campaign_objective_enum', [
  'awareness',
  'engagement',
  'conversion',
  'ugc',
]);

export const campaignStatusEnum = pgEnum('campaign_status_enum', [
  'active',
  'archived',
  'completed',
]);

export const channelEnum = pgEnum('channel_enum', [
  'email',
  'whatsapp',
]);

export const consentStateEnum = pgEnum('consent_state_enum', [
  'unknown',
  'contactable',
  'opted_out',
  'bounced_invalid',
  'opt_in_required',
]);

export const sequenceStatusEnum = pgEnum('sequence_status_enum', [
  'active',
  'stopped',
  'completed',
]);

export const sequenceStopReasonEnum = pgEnum('sequence_stop_reason_enum', [
  'reply',
  'opt_out',
  'manual',
  'stage_terminal',
  'campaign_archived',
  'mailbox_revoked',
  'quality_pause',
  'subscription_expired',
]);

export const ledgerEntryTypeEnum = pgEnum('ledger_entry_type_enum', [
  'allowance_grant',
  'topup_purchase',
  'consumption',
  'expiry',
  'refund_adjustment',
  'promo_grant',
  'reversal',
  'reserved',
  'released',
  'committed',
]);

export const reservationStatusEnum = pgEnum('reservation_status_enum', [
  'active',
  'committed',
  'released',
  'expired',
]);

export const discoveryJobTypeEnum = pgEnum('discovery_job_type_enum', [
  'live_search',
  'add_by_url',
  'deep_enrichment',
  'refresh',
]);

export const discoveryJobStatusEnum = pgEnum('discovery_job_status_enum', [
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
]);

export const timelineActorTypeEnum = pgEnum('timeline_actor_type_enum', [
  'user',
  'system',
  'ai',
  'staff_impersonated',
]);

export const scopeClassEnum = pgEnum('scope_class_enum', [
  'gcp',
  'wp',
  'platform',
]);
