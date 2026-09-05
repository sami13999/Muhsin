/**
 * GCP Schema — Global Creator Plane (Doc 19 Part C, D).
 * Tables: creator, profile, enrichment_snapshot, niche_classification,
 *          contact_record, inflight_url_lock.
 *
 * NO foreign keys cross schema boundaries (ADR-024).
 * GDPR erasure: PII nullification tombstone (ADR-025).
 */
import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  numeric,
  bigint,
  integer,
  jsonb,
  index,
  uniqueIndex,
  unique,
} from 'drizzle-orm/pg-core';
import {
  platformEnum,
  enrichmentSourceEnum,
  completenessTierEnum,
  creatorMergeStatusEnum,
  snapshotTypeEnum,
  confidenceLevelEnum,
  contactTypeEnum,
  contactSourceEnum,
} from '../enums/index.js';

// ── gcp.creator ──────────────────────────────────────────────

export const creator = pgTable(
  'creator',
  {
    creatorId: uuid('creator_id').primaryKey().defaultRandom(),
    displayName: text('display_name'),
    // PII — nulled to '[erased]' on GDPR erasure (ADR-025)
    primaryHandle: text('primary_handle'),

    // Identity resolution lifecycle (PATCH-008)
    mergeStatus: creatorMergeStatusEnum('merge_status').notNull().default('active'),
    mergedIntoCreatorId: uuid('merged_into_creator_id'),
    // Self-references gcp.creator(creator_id) — FK handled in raw SQL
    // (Drizzle self-references require explicit foreignKey call)
    mergeCandidateFor: uuid('merge_candidate_for'),
    mergeConfidence: numeric('merge_confidence', { precision: 5, scale: 4 }),

    // Index state (PATCH-009, ADR-027)
    indexPending: boolean('index_pending').notNull().default(false),

    // Minor safety (ADR-029)
    // When true: contact-reveal, campaign-add, outreach-enrollment closed by default.
    // This is an invariant, not a feature flag.
    minorSignal: boolean('minor_signal').notNull().default(false),

    // Semantic search (ADR-033)
    // pgvector embedding for "find creators like this one" feature
    embedding: text('embedding'),
    // Stored as JSON string; pgvector type not directly supported in Drizzle

    // GDPR lifecycle (ADR-025)
    piiErasedAt: timestamp('pii_erased_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Creator lookup by merge state (identity resolution queries)
    index('idx_creator_merge_status')
      .on(table.mergeStatus)
      .where(sql`${table.mergeStatus} IN ('candidate', 'merged_into')`),
    // Creator GDPR erasure pipeline
    index('idx_creator_pii_erased')
      .on(table.piiErasedAt)
      .where(sql`${table.piiErasedAt} IS NOT NULL`),
  ],
);

// ── gcp.profile ──────────────────────────────────────────────

export const profile = pgTable(
  'profile',
  {
    profileId: uuid('profile_id').primaryKey().defaultRandom(),
    creatorId: uuid('creator_id').notNull(),
    // FK to gcp.creator — enforced in raw SQL (same schema, no cross-schema issue)
    platform: platformEnum('platform').notNull(),

    // Canonical identity anchor — dedup key (PATCH-007/009)
    canonicalUrl: text('canonical_url').notNull(),
    handle: text('handle'),
    handleVariants: text('handle_variants').array(),

    // Enrichment metadata
    enrichmentSource: enrichmentSourceEnum('enrichment_source')
      .notNull()
      .default('user_submitted'),
    payloadCompletenessTier: completenessTierEnum('payload_completeness_tier')
      .notNull()
      .default('minimal'),
    enrichmentStatus: text('enrichment_status').notNull().default('pending'),
    enrichedAt: timestamp('enriched_at', { withTimezone: true }),
    enrichmentTtlDays: integer('enrichment_ttl_days').notNull().default(30),

    // Universal metrics (platform-agnostic)
    followerCount: bigint('follower_count', { mode: 'bigint' }),
    engagementRate: numeric('engagement_rate', { precision: 8, scale: 6 }),
    lastPostAt: timestamp('last_post_at', { withTimezone: true }),

    // YouTube-specific metrics (NULL for non-YouTube profiles)
    ytSubscriberCount: bigint('yt_subscriber_count', { mode: 'bigint' }),
    ytViewCount: bigint('yt_view_count', { mode: 'bigint' }),
    ytVideoCount: integer('yt_video_count'),
    ytSubscriberToViewRatio: numeric('yt_subscriber_to_view_ratio', {
      precision: 10,
      scale: 8,
    }),
    ytAvgViewsPerVideo: numeric('yt_avg_views_per_video', {
      precision: 12,
      scale: 2,
    }),

    // Platform-specific structured payload
    platformMetrics: jsonb('platform_metrics'),

    // Archive reference
    scrapedPayloadRef: text('scraped_payload_ref'),

    // Search index projection state
    indexProjectionVersion: integer('index_projection_version').notNull().default(0),

    // GDPR lifecycle
    piiErasedAt: timestamp('pii_erased_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // M5 UPSERT target (PATCH-007)
    unique('uq_profile_platform_url').on(table.platform, table.canonicalUrl),
    // Profile by creator (enumerate a creator's profiles)
    index('idx_profile_creator').on(table.creatorId),
    // Profile enrichment status sweep
    index('idx_profile_enrichment_status')
      .on(table.enrichmentStatus, table.enrichedAt)
      .where(sql`${table.enrichmentStatus} IN ('stale', 'pending', 'failed')`),
    // YouTube authenticity signal filtering
    index('idx_profile_yt_ratio')
      .on(table.ytSubscriberToViewRatio)
      .where(sql`${table.ytSubscriberToViewRatio} IS NOT NULL`),
  ],
);

// ── gcp.enrichment_snapshot ──────────────────────────────────

export const enrichmentSnapshot = pgTable(
  'enrichment_snapshot',
  {
    snapshotId: uuid('snapshot_id').primaryKey().defaultRandom(),
    creatorId: uuid('creator_id').notNull(),
    // FK to gcp.creator
    snapshotType: snapshotTypeEnum('snapshot_type').notNull(),

    // Score output (structured per type)
    verdict: jsonb('verdict').notNull(),
    evidenceBreakdown: jsonb('evidence_breakdown').notNull(),
    confidenceLevel: confidenceLevelEnum('confidence_level').notNull(),
    dataBasisStatement: text('data_basis_statement').notNull(),

    // Provenance triple (ADR-028, PATCH-010)
    promptVersion: text('prompt_version').notNull(),
    modelVersion: text('model_version').notNull(),
    contentHash: text('content_hash').notNull(),

    // Scoring currency (ADR-028)
    isCurrent: boolean('is_current').notNull().default(true),

    // Job correlation
    jobId: uuid('job_id'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Current score lookup per creator/type
    index('idx_snapshot_creator_type_current')
      .on(table.creatorId, table.snapshotType)
      .where(sql`${table.isCurrent} = true`),
    // Prompt version sweep (ADR-028 re-scoring backfill)
    index('idx_snapshot_prompt_version')
      .on(table.snapshotType, table.promptVersion, table.modelVersion)
      .where(sql`${table.isCurrent} = true`),
  ],
);

// ── gcp.niche_classification ─────────────────────────────────

export const nicheClassification = pgTable(
  'niche_classification',
  {
    classificationId: uuid('classification_id').primaryKey().defaultRandom(),
    creatorId: uuid('creator_id').notNull(),
    // FK to gcp.creator
    primaryNiche: text('primary_niche').notNull(),
    // Validated against platform.niche_vocab.slug at application layer
    secondaryNiches: text('secondary_niches').array().notNull().default([]),
    nicheConfidence: confidenceLevelEnum('niche_confidence').notNull(),
    promptVersion: text('prompt_version').notNull(),
    classifiedAt: timestamp('classified_at', { withTimezone: true }).notNull().defaultNow(),
    isCurrent: boolean('is_current').notNull().default(true),
  },
  (table) => [
    // Exactly one current classification per creator
    uniqueIndex('idx_niche_class_current')
      .on(table.creatorId)
      .where(sql`${table.isCurrent} = true`),
  ],
);

// ── gcp.contact_record ───────────────────────────────────────

export const contactRecord = pgTable(
  'contact_record',
  {
    contactId: uuid('contact_id').primaryKey().defaultRandom(),
    creatorId: uuid('creator_id').notNull(),
    // FK to gcp.creator
    contactType: contactTypeEnum('contact_type').notNull(),
    value: text('value'),
    // Nulled on GDPR erasure (ADR-025)
    source: contactSourceEnum('source').notNull(),
    confidence: confidenceLevelEnum('confidence').notNull(),
    discoveredAt: timestamp('discovered_at', { withTimezone: true }).notNull().defaultNow(),
    piiErasedAt: timestamp('pii_erased_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_contact_creator').on(table.creatorId),
  ],
);

// ── gcp.inflight_url_lock (PATCH-007) ────────────────────────

export const inflightUrlLock = pgTable(
  'inflight_url_lock',
  {
    canonicalUrl: text('canonical_url').primaryKey(),
    jobId: uuid('job_id').notNull(),
    dispatchedAt: timestamp('dispatched_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('idx_inflight_url_expires').on(table.expiresAt),
  ],
);
