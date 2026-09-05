/**
 * Creator Index Projection (ADR-027).
 * Transforms GCP creator + profile + enrichment data into a flat Meilisearch document.
 * Uses M2 repository for data access (Doc 14 boundary rule).
 * Called by M5 after GCP persistence. Synchronous for new creators (ADR-027).
 */
import type { Database } from '../client.js';
import { findById, type CreatorWithRelations } from '../repositories/creator.repository.js';

/**
 * Meilisearch document shape (Doc 15 B1 — flattened creator projection).
 * Fields match adapter's configureIndex() filterable/sortable/searchable attributes.
 */
export interface CreatorIndexDocument {
  id: string;
  // Identity
  displayName: string;
  primaryHandle: string;
  handleVariants: string[];
  platform: string;
  location: string | null;
  languages: string[];
  bio: string | null;

  // Metrics
  followerCount: number;
  engagementRate: number | null;
  postCount: number | null;

  // LLM-derived attributes (populated by M6 at ingestion, stored in GCP)
  primaryNiche: string;
  secondaryNiches: string[];
  authenticityBand: 'strong' | 'moderate' | 'weak' | 'unknown';
  authenticityScore: number | null;
  qualityScore: number | null;
  audiencePkShare: number | null;
  audienceGccShare: number | null;
  audienceDiasporaShare: number | null;
  languageMix: string[] | null;

  // Demographics (Problem 3)
  audienceFemalePercent: number | null;
  audienceMalePercent: number | null;
  audienceAgeBands: Record<string, number> | null;
  audienceCities: Record<string, number> | null;
  audienceCountries: Record<string, number> | null;

  // Rising score (Problem 1) — computed at query time, stored as null in projection
  risingScore: number | null;

  // Completeness
  completenessTier: 'rich' | 'standard' | 'sparse' | 'minimal';

  // Freshness
  lastEnrichedAt: string | null;
  lastRefreshedAt: string | null;
  createdAt: string;
}

/**
 * Map a creator with relations to the Meilisearch document schema.
 * Fields match adapter's configureIndex() filterable/sortable/searchable attributes.
 */
function mapToSearchDocument(creatorData: CreatorWithRelations): CreatorIndexDocument {
  const { creator: c, profiles, enrichmentSnapshots, nicheClassifications } = creatorData;

  // Primary profile = highest follower count
  const primaryProfile = profiles[0] ?? null;

  // Current snapshots by type
  const snapshotMap = new Map<string, (typeof enrichmentSnapshots)[0]>();
  for (const s of enrichmentSnapshots) {
    snapshotMap.set(s.snapshotType, s);
  }

  const authenticity = snapshotMap.get('authenticity');
  const quality = snapshotMap.get('quality');
  const audience = snapshotMap.get('audience_estimate');

  // Current niche classification
  const niche = nicheClassifications[0] ?? null;

  // Parse authenticity band from verdict
  const authVerdict = authenticity?.verdict as Record<string, unknown> | undefined;
  const rawBand = authVerdict?.['band'] as string | undefined;
  const authenticityBand: CreatorIndexDocument['authenticityBand'] =
    rawBand === 'strong' || rawBand === 'moderate' || rawBand === 'weak' ? rawBand : 'unknown';

  // Parse audience estimates from verdict
  const audVerdict = audience?.verdict as Record<string, unknown> | undefined;

  // Parse demographics from profile platformMetrics JSONB (gcp.profile.platform_metrics)
  const platformMetrics = primaryProfile?.platformMetrics as Record<string, unknown> | undefined;
  const demographics = platformMetrics?.['audience_demographics'] as Record<string, unknown> | undefined;
  const genderData = demographics?.['gender'] as Record<string, number> | undefined;
  const ageData = demographics?.['age'] as Record<string, number> | undefined;
  const cityData = demographics?.['cities'] as Record<string, number> | undefined;
  const countryData = demographics?.['countries'] as Record<string, number> | undefined;

  return {
    id: c.creatorId,
    displayName: c.displayName ?? '',
    primaryHandle: c.primaryHandle ?? '',
    handleVariants: primaryProfile?.handleVariants ?? [],
    platform: primaryProfile?.platform ?? 'unknown',
    location: null, // Not in GCP schema yet
    languages: [], // Not in GCP schema yet
    bio: null, // Not in GCP schema yet

    followerCount: Number(primaryProfile?.followerCount ?? 0),
    engagementRate: primaryProfile?.engagementRate ? Number(primaryProfile.engagementRate) : null,
    postCount: null, // Not in GCP schema yet

    primaryNiche: niche?.primaryNiche ?? 'unknown',
    secondaryNiches: niche?.secondaryNiches ?? [],
    authenticityBand,
    authenticityScore: authVerdict?.['score'] != null ? Number(authVerdict['score']) : null,
    qualityScore: quality?.verdict ? Number((quality.verdict as Record<string, unknown>)['score'] ?? 0) : null,
    audiencePkShare: audVerdict?.['pk_share'] != null ? Number(audVerdict['pk_share']) : null,
    audienceGccShare: audVerdict?.['gcc_share'] != null ? Number(audVerdict['gcc_share']) : null,
    audienceDiasporaShare: audVerdict?.['diaspora_share'] != null ? Number(audVerdict['diaspora_share']) : null,
    languageMix: audVerdict?.['language_mix'] != null ? (audVerdict['language_mix'] as string[]) : null,

    // Demographics (Problem 3)
    audienceFemalePercent: genderData?.['female'] != null ? Number(genderData['female']) * 100 : null,
    audienceMalePercent: genderData?.['male'] != null ? Number(genderData['male']) * 100 : null,
    audienceAgeBands: ageData ?? null,
    audienceCities: cityData ?? null,
    audienceCountries: countryData ?? null,

    // Rising score (Problem 1) — computed at query time
    risingScore: null,

    completenessTier: primaryProfile?.payloadCompletenessTier ?? 'minimal',

    lastEnrichedAt: primaryProfile?.enrichedAt?.toISOString() ?? null,
    lastRefreshedAt: primaryProfile?.updatedAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
  };
}

/**
 * Project a single creator to the Meilisearch document schema.
 * Uses the M2 repository for data access (Doc 14 boundary rule).
 *
 * @param creatorId - UUID of the creator to project
 * @param db - Drizzle database instance
 * @param meilisearch - Meilisearch adapter for upsert
 * @returns { success: true, documentId } or { success: false, reason }
 */
export async function projectCreatorToIndex(
  creatorId: string,
  db: Database,
  meilisearch: { upsertDocument: (index: string, doc: Record<string, unknown>) => Promise<{ success: boolean; degraded?: boolean }> },
): Promise<{ success: true; documentId: string } | { success: false; reason: string }> {
  // 1. Read creator with all relations via repository
  const creatorData = await findById(db, creatorId);
  if (!creatorData) {
    return { success: false, reason: 'Creator not found' };
  }

  // 2. Skip GDPR-erased creators
  if (creatorData.creator.piiErasedAt) {
    return { success: false, reason: 'Creator is GDPR-erased' };
  }

  // 3. Map to search document
  const document = mapToSearchDocument(creatorData);

  // 4. Upsert to Meilisearch (ADR-027: synchronous, but NOT in the Postgres transaction)
  const result = await meilisearch.upsertDocument('creators', document as unknown as Record<string, unknown>);

  if (!result.success) {
    // Meilisearch unavailable — projection deferred, not failed
    // Creator exists in GCP but not in search index
    console.warn(`[ADR-027] Projection deferred for creator ${creatorId}: Meilisearch unavailable`);
    return { success: false, reason: 'projection_deferred' };
  }

  return { success: true, documentId: creatorId };
}

/**
 * Project multiple creators (batch). Used by re-projection jobs.
 */
export async function projectCreatorsToIndex(
  creatorIds: string[],
  db: Database,
  meilisearch: { upsertDocument: (index: string, doc: Record<string, unknown>) => Promise<{ success: boolean; degraded?: boolean }> },
): Promise<{ succeeded: string[]; deferred: string[] }> {
  const succeeded: string[] = [];
  const deferred: string[] = [];

  for (const id of creatorIds) {
    const result = await projectCreatorToIndex(id, db, meilisearch);
    if (result.success) {
      succeeded.push(id);
    } else {
      deferred.push(id);
    }
  }

  return { succeeded, deferred };
}
