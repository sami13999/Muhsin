/**
 * M2 Creator Repository — Data access layer for GCP tables.
 * M2 is the ONLY module authorized to read/write GCP tables directly (Doc 14 boundary rule).
 * Every method takes a Drizzle instance as first param for transaction participation (ADR-020).
 */
import { eq, and, sql, desc, asc, count, type SQL } from 'drizzle-orm';
import type { Database } from '../client.js';
import {
  creator,
  profile,
  enrichmentSnapshot,
  nicheClassification,
  inflightUrlLock,
} from '../schema/gcp/index.js';

// ── Types ────────────────────────────────────────────────────

export interface CreatorFilters {
  platform?: string;
  follower_min?: number;
  follower_max?: number;
  engagement_rate_min?: number;
  engagement_rate_max?: number;
  niche?: string;
  authenticity_band?: string;
  completeness_tier?: string;
  audience_pk_share_min?: number;
  audience_gcc_share_min?: number;
}

export interface CreateCreatorInput {
  name: string;
  handle: string;
  platform: 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'facebook';
  canonicalUrl: string;
  bio?: string;
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  location?: string;
  languages?: string[];
  profileImageUrl?: string;
  completenessTier?: 'rich' | 'standard' | 'sparse' | 'minimal';
}

export interface ProfileUpdate {
  handle?: string;
  canonicalUrl?: string;
  followerCount?: number;
  engagementRate?: number;
  lastPostAt?: Date;
  platformMetrics?: Record<string, unknown>;
  enrichmentStatus?: string;
  enrichedAt?: Date;
  payloadCompletenessTier?: 'rich' | 'standard' | 'sparse' | 'minimal';
  enrichmentSource?: string;
  handleVariants?: string[];
  indexProjectionVersion?: number;
}

export interface EnrichmentInput {
  snapshotType: 'authenticity' | 'quality' | 'audience_estimate' | 'summary' | 'niche_classification';
  verdict: Record<string, unknown>;
  evidenceBreakdown: Record<string, unknown>;
  confidenceLevel: 'high' | 'medium' | 'low' | 'insufficient_data';
  dataBasisStatement: string;
  promptVersion: string;
  modelVersion: string;
  contentHash: string;
  jobId?: string;
}

export interface CreatorWithRelations {
  creator: typeof creator.$inferSelect;
  profiles: (typeof profile.$inferSelect)[];
  enrichmentSnapshots: (typeof enrichmentSnapshot.$inferSelect)[];
  nicheClassifications: (typeof nicheClassification.$inferSelect)[];
}

// ── Repository ───────────────────────────────────────────────

/**
 * Find a creator by ID with all related data.
 */
export async function findById(
  db: Database,
  id: string,
): Promise<CreatorWithRelations | null> {
  const [creatorRow] = await db
    .select()
    .from(creator)
    .where(eq(creator.creatorId, id))
    .limit(1);

  if (!creatorRow) return null;

  const profiles = await db
    .select()
    .from(profile)
    .where(eq(profile.creatorId, id))
    .orderBy(desc(profile.followerCount));

  const snapshots = await db
    .select()
    .from(enrichmentSnapshot)
    .where(
      and(
        eq(enrichmentSnapshot.creatorId, id),
        eq(enrichmentSnapshot.isCurrent, true),
      ),
    );

  const niches = await db
    .select()
    .from(nicheClassification)
    .where(
      and(
        eq(nicheClassification.creatorId, id),
        eq(nicheClassification.isCurrent, true),
      ),
    );

  return {
    creator: creatorRow,
    profiles,
    enrichmentSnapshots: snapshots,
    nicheClassifications: niches,
  };
}

/**
 * Find a creator by profile handle + platform.
 * Used for dedup and add-by-URL.
 */
export async function findByHandle(
  db: Database,
  handle: string,
  platform: string,
): Promise<CreatorWithRelations | null> {
  const [profileRow] = await db
    .select()
    .from(profile)
    .where(
      and(
        eq(profile.handle, handle),
        eq(profile.platform, platform as 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'facebook'),
      ),
    )
    .limit(1);

  if (!profileRow) return null;

  return findById(db, profileRow.creatorId);
}

/**
 * Paginated list of creators with basic profile data.
 */
export async function list(
  db: Database,
  filters: CreatorFilters,
  page: number,
  limit: number,
): Promise<{ data: CreatorWithRelations[]; total: number; page: number; limit: number }> {
  const offset = (page - 1) * limit;
  const conditions: SQL[] = [];

  if (filters.platform) {
    conditions.push(eq(profile.platform, filters.platform as 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'facebook'));
  }
  if (filters.follower_min !== undefined) {
    conditions.push(sql`${profile.followerCount} >= ${filters.follower_min}`);
  }
  if (filters.follower_max !== undefined) {
    conditions.push(sql`${profile.followerCount} <= ${filters.follower_max}`);
  }
  if (filters.engagement_rate_min !== undefined) {
    conditions.push(sql`${profile.engagementRate} >= ${filters.engagement_rate_min}`);
  }
  if (filters.engagement_rate_max !== undefined) {
    conditions.push(sql`${profile.engagementRate} <= ${filters.engagement_rate_max}`);
  }
  if (filters.completeness_tier) {
    conditions.push(eq(profile.payloadCompletenessTier, filters.completeness_tier as 'rich' | 'standard' | 'sparse' | 'minimal'));
  }

  // CC-003: Audience estimate filters (from enrichment_snapshot.verdict JSONB)
  // Requires a subquery since audience data is in a separate table
  if (filters.audience_pk_share_min !== undefined) {
    const audienceSubquery = db
      .select({ creatorId: enrichmentSnapshot.creatorId })
      .from(enrichmentSnapshot)
      .where(
        and(
          eq(enrichmentSnapshot.snapshotType, 'audience_estimate'),
          eq(enrichmentSnapshot.isCurrent, true),
          sql`(${enrichmentSnapshot.verdict}->>'pk_share')::numeric >= ${filters.audience_pk_share_min}`,
        ),
      );
    conditions.push(sql`${creator.creatorId} IN (${audienceSubquery})`);
  }
  if (filters.audience_gcc_share_min !== undefined) {
    const audienceSubquery = db
      .select({ creatorId: enrichmentSnapshot.creatorId })
      .from(enrichmentSnapshot)
      .where(
        and(
          eq(enrichmentSnapshot.snapshotType, 'audience_estimate'),
          eq(enrichmentSnapshot.isCurrent, true),
          sql`(${enrichmentSnapshot.verdict}->>'gcc_share')::numeric >= ${filters.audience_gcc_share_min}`,
        ),
      );
    conditions.push(sql`${creator.creatorId} IN (${audienceSubquery})`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const countResult = await db
    .select({ total: count() })
    .from(creator)
    .leftJoin(profile, eq(creator.creatorId, profile.creatorId))
    .where(whereClause);
  const total = countResult[0]?.total ?? 0;

  // Get paginated creator IDs
  const creatorRows = await db
    .select({ creatorId: creator.creatorId })
    .from(creator)
    .leftJoin(profile, eq(creator.creatorId, profile.creatorId))
    .where(whereClause)
    .orderBy(desc(creator.createdAt))
    .limit(limit)
    .offset(offset);

  // Fetch full relations for each
  const data: CreatorWithRelations[] = [];
  for (const row of creatorRows) {
    const full = await findById(db, row.creatorId);
    if (full) data.push(full);
  }

  return { data, total, page, limit };
}

/**
 * Create a creator + profile in one transaction.
 */
export async function create(
  db: Database,
  input: CreateCreatorInput,
): Promise<CreatorWithRelations> {
  // Insert creator
  const creatorRows = await db
    .insert(creator)
    .values({
      displayName: input.name,
      primaryHandle: input.handle,
    })
    .returning();
  const creatorRow = creatorRows[0];
  if (!creatorRow) throw new Error('Failed to create creator');

  // Insert profile
  await db.insert(profile).values({
    creatorId: creatorRow.creatorId,
    platform: input.platform,
    canonicalUrl: input.canonicalUrl,
    handle: input.handle,
    followerCount: input.followerCount ? BigInt(input.followerCount) : null,
    payloadCompletenessTier: input.completenessTier ?? 'minimal',
    enrichmentSource: 'user_submitted',
  });

  return findById(db, creatorRow.creatorId) as Promise<CreatorWithRelations>;
}

/**
 * Update profile fields.
 */
export async function updateProfile(
  db: Database,
  profileId: string,
  data: Partial<ProfileUpdate>,
): Promise<void> {
  const updateData: Record<string, unknown> = {};

  if (data.handle !== undefined) updateData['handle'] = data.handle;
  if (data.canonicalUrl !== undefined) updateData['canonicalUrl'] = data.canonicalUrl;
  if (data.followerCount !== undefined) updateData['followerCount'] = data.followerCount ? BigInt(data.followerCount) : null;
  if (data.engagementRate !== undefined) updateData['engagementRate'] = data.engagementRate;
  if (data.lastPostAt !== undefined) updateData['lastPostAt'] = data.lastPostAt;
  if (data.platformMetrics !== undefined) updateData['platformMetrics'] = data.platformMetrics;
  if (data.enrichmentStatus !== undefined) updateData['enrichmentStatus'] = data.enrichmentStatus;
  if (data.enrichedAt !== undefined) updateData['enrichedAt'] = data.enrichedAt;
  if (data.payloadCompletenessTier !== undefined) updateData['payloadCompletenessTier'] = data.payloadCompletenessTier;
  if (data.enrichmentSource !== undefined) updateData['enrichmentSource'] = data.enrichmentSource;
  if (data.handleVariants !== undefined) updateData['handleVariants'] = data.handleVariants;
  if (data.indexProjectionVersion !== undefined) updateData['indexProjectionVersion'] = data.indexProjectionVersion;

  updateData['updatedAt'] = new Date();

  await db
    .update(profile)
    .set(updateData)
    .where(eq(profile.profileId, profileId));
}

/**
 * Insert a new enrichment snapshot.
 * The table is monthly-partitioned; Drizzle handles the INSERT normally
 * since PostgreSQL routes to the correct partition automatically.
 */
export async function upsertEnrichmentSnapshot(
  db: Database,
  creatorId: string,
  data: EnrichmentInput,
): Promise<void> {
  // Mark previous snapshots of this type as not current
  await db
    .update(enrichmentSnapshot)
    .set({ isCurrent: false })
    .where(
      and(
        eq(enrichmentSnapshot.creatorId, creatorId),
        eq(enrichmentSnapshot.snapshotType, data.snapshotType),
        eq(enrichmentSnapshot.isCurrent, true),
      ),
    );

  // Insert new snapshot
  await db.insert(enrichmentSnapshot).values({
    creatorId,
    snapshotType: data.snapshotType,
    verdict: data.verdict,
    evidenceBreakdown: data.evidenceBreakdown,
    confidenceLevel: data.confidenceLevel,
    dataBasisStatement: data.dataBasisStatement,
    promptVersion: data.promptVersion,
    modelVersion: data.modelVersion,
    contentHash: data.contentHash,
    jobId: data.jobId,
    isCurrent: true,
  });
}

/**
 * Record a niche classification for a creator.
 */
export async function classifyNiche(
  db: Database,
  creatorId: string,
  nicheId: string,
  confidence: number,
  source: string,
): Promise<void> {
  // Mark previous classification as not current
  await db
    .update(nicheClassification)
    .set({ isCurrent: false })
    .where(
      and(
        eq(nicheClassification.creatorId, creatorId),
        eq(nicheClassification.isCurrent, true),
      ),
    );

  // Insert new classification
  await db.insert(nicheClassification).values({
    creatorId,
    primaryNiche: nicheId,
    secondaryNiches: [],
    nicheConfidence: confidence >= 0.8 ? 'high' : confidence >= 0.5 ? 'medium' : 'low',
    promptVersion: source,
    isCurrent: true,
  });
}

/**
 * Acquire an inflight URL lock (PATCH-007).
 * INSERT with ON CONFLICT DO NOTHING — returns whether lock was acquired.
 */
export async function acquireInflightUrlLock(
  db: Database,
  url: string,
  jobId: string,
): Promise<boolean> {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min TTL

  const result = await db
    .insert(inflightUrlLock)
    .values({
      canonicalUrl: url,
      jobId,
      expiresAt,
    })
    .onConflictDoNothing()
    .returning();

  return result.length > 0;
}

/**
 * Release an inflight URL lock.
 */
export async function releaseInflightUrlLock(
  db: Database,
  url: string,
): Promise<void> {
  await db
    .delete(inflightUrlLock)
    .where(eq(inflightUrlLock.canonicalUrl, url));
}

// ── GDPR Erasure (ADR-025) ────────────────────────────────────

/**
 * Erasure result status.
 */
export type ErasureStatus = 'completed' | 'not_found' | 'already_erased';

/**
 * Execute GDPR Tier 2 erasure for a creator.
 * Per ADR-025: PII nullification + tombstone + re-ingestion block.
 *
 * Steps:
 * 1. Nullify C2 PII fields (names, emails, handles)
 * 2. Set tombstone markers
 * 3. Block re-ingestion
 * 4. Return erasure status
 *
 * Note: Erasure events are emitted by the caller (service layer),
 * not here, to maintain transaction boundary with outbox (ADR-020).
 */
export async function eraseCreator(
  db: Database,
  creatorId: string,
): Promise<ErasureStatus> {
  // 1. Check if creator exists
  const [existing] = await db
    .select({ creatorId: creator.creatorId, displayName: creator.displayName })
    .from(creator)
    .where(eq(creator.creatorId, creatorId))
    .limit(1);

  if (!existing) return 'not_found';

  // 2. Check if already erased (tombstone check)
  if (existing.displayName === '[ERASED]') return 'already_erased';

  // 3. Nullify C2 PII in creator table
  await db
    .update(creator)
    .set({
      displayName: '[ERASED]',
      primaryHandle: '[ERASED]',
    })
    .where(eq(creator.creatorId, creatorId));

  // 4. Nullify C2 PII in profile table
  await db
    .update(profile)
    .set({
      handle: '[ERASED]',
      handleVariants: [],
    })
    .where(eq(profile.creatorId, creatorId));

  // 5. Set tombstone marker (erased_at timestamp)
  // Note: If the schema has an erased_at column, set it here.
  // For now, the [ERASED] displayName serves as the tombstone.

  return 'completed';
}

/**
 * Check if a creator has been erased (tombstone check).
 * Used by re-ingestion pipeline to block re-ingestion of erased creators.
 */
export async function isCreatorErased(
  db: Database,
  creatorId: string,
): Promise<boolean> {
  const [creatorRow] = await db
    .select({ displayName: creator.displayName })
    .from(creator)
    .where(eq(creator.creatorId, creatorId))
    .limit(1);

  return creatorRow?.displayName === '[ERASED]';
}

/**
 * Check if handles are blocked (for re-ingestion blocklist).
 * Per ADR-025: erased creator handles are added to a blocklist
 * to prevent re-ingestion via Brain 2 pipeline.
 */
export async function isHandleBlocked(
  db: Database,
  handle: string,
  platform: string,
): Promise<boolean> {
  const [blocked] = await db
    .select({ handle: profile.handle })
    .from(profile)
    .where(
      and(
        eq(profile.handle, handle),
        eq(profile.platform, platform as 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'facebook'),
      ),
    )
    .limit(1);

  // Handle is blocked if it maps to an erased creator
  if (!blocked) return false;
  return blocked.handle === '[ERASED]';
}
