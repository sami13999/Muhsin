/**
 * Identity Resolution — ADR-029 Weighted-Evidence Scoring Model.
 *
 * Deterministic, explainable scoring for creator identity matching.
 * Every merge (especially auto-merges) must be defensible to a human reviewer.
 *
 * Signal weights (summed, capped at 100):
 * - Shared verified email/WhatsApp: 45
 * - Verified website ownership: 35
 * - Explicit cross-mention (bio claim): 35
 * - Shared Linktree/link-in-bio: 20
 * - Face similarity >0.92: 20 (supporting only, never decisive alone)
 * - Username identical/near-identical: 15
 * - Cross-mentioned handles: 10
 * - Structured metadata match: 10
 * - Display name exact match: 10
 * - Manual reviewer confirmation: 100 (overrides)
 *
 * Thresholds:
 * - >=90: auto-merge (merge_status = active)
 * - 60-89: candidate (human_review_required = true)
 * - <60: independent (signals logged for future re-evaluation)
 *
 * Design rule: no single signal below 35 may reach auto-merge alone.
 */

// ── Types ────────────────────────────────────────────────────

export type SignalType =
  | 'shared_verified_contact'
  | 'website_ownership_match'
  | 'explicit_cross_mention'
  | 'shared_linktree'
  | 'face_similarity'
  | 'username_match'
  | 'cross_mentioned_handle'
  | 'structured_metadata_match'
  | 'display_name_match'
  | 'manual_reviewer_confirmation';

export interface EvidenceSignal {
  type: SignalType;
  weight: number;
  detail: string;
  source?: string;
}

export interface IdentityScore {
  confidence: number;
  mergeStatus: 'active' | 'candidate' | 'independent';
  confidenceReasoning: string;
  evidenceBreakdown: EvidenceSignal[];
  humanReviewRequired: boolean;
}

export interface CreatorIdentityData {
  creatorId: string;
  displayName?: string | null;
  primaryHandle?: string | null;
  emails?: string[];
  phoneNumbers?: string[];
  websites?: string[];
  socialLinks?: string[];
  bioLinks?: string[];
  platformData?: Record<string, unknown>;
}

// ── Signal Weights (ADR-029) ─────────────────────────────────

const SIGNAL_WEIGHTS: Record<SignalType, number> = {
  shared_verified_contact: 45,
  website_ownership_match: 35,
  explicit_cross_mention: 35,
  shared_linktree: 20,
  face_similarity: 20,
  username_match: 15,
  cross_mentioned_handle: 10,
  structured_metadata_match: 10,
  display_name_match: 10,
  manual_reviewer_confirmation: 100,
};

// ── Thresholds ───────────────────────────────────────────────

const AUTO_MERGE_THRESHOLD = 90;
const CANDIDATE_THRESHOLD = 60;

// ── Scoring Engine ───────────────────────────────────────────

/**
 * Calculate identity match score between two creators.
 * Returns a deterministic, explainable score.
 */
export function calculateIdentityScore(
  source: CreatorIdentityData,
  candidate: CreatorIdentityData,
  additionalSignals?: EvidenceSignal[],
): IdentityScore {
  const signals: EvidenceSignal[] = [];

  // 1. Shared verified contact (email or WhatsApp)
  const sharedContact = findSharedVerifiedContact(source, candidate);
  if (sharedContact) {
    signals.push({
      type: 'shared_verified_contact',
      weight: SIGNAL_WEIGHTS.shared_verified_contact,
      detail: sharedContact,
    });
  }

  // 2. Website ownership match
  const websiteMatch = findWebsiteOwnershipMatch(source, candidate);
  if (websiteMatch) {
    signals.push({
      type: 'website_ownership_match',
      weight: SIGNAL_WEIGHTS.website_ownership_match,
      detail: websiteMatch,
    });
  }

  // 3. Explicit cross-mention (bio link claiming ownership)
  const crossMention = findExplicitCrossMention(source, candidate);
  if (crossMention) {
    signals.push({
      type: 'explicit_cross_mention',
      weight: SIGNAL_WEIGHTS.explicit_cross_mention,
      detail: crossMention,
    });
  }

  // 4. Shared Linktree/link-in-bio
  const sharedLinktree = findSharedLinktree(source, candidate);
  if (sharedLinktree) {
    signals.push({
      type: 'shared_linktree',
      weight: SIGNAL_WEIGHTS.shared_linktree,
      detail: sharedLinktree,
    });
  }

  // 5. Face similarity (supporting signal only, capped low)
  const faceSimilarity = checkFaceSimilarity(source, candidate);
  if (faceSimilarity) {
    signals.push({
      type: 'face_similarity',
      weight: SIGNAL_WEIGHTS.face_similarity,
      detail: faceSimilarity,
    });
  }

  // 6. Username match
  const usernameMatch = checkUsernameMatch(source, candidate);
  if (usernameMatch) {
    signals.push({
      type: 'username_match',
      weight: SIGNAL_WEIGHTS.username_match,
      detail: usernameMatch,
    });
  }

  // 7. Cross-mentioned handles
  const crossHandle = findCrossMentionedHandle(source, candidate);
  if (crossHandle) {
    signals.push({
      type: 'cross_mentioned_handle',
      weight: SIGNAL_WEIGHTS.cross_mentioned_handle,
      detail: crossHandle,
    });
  }

  // 8. Structured metadata match
  const metadataMatch = checkStructuredMetadataMatch(source, candidate);
  if (metadataMatch) {
    signals.push({
      type: 'structured_metadata_match',
      weight: SIGNAL_WEIGHTS.structured_metadata_match,
      detail: metadataMatch,
    });
  }

  // 9. Display name match
  const displayNameMatch = checkDisplayNameMatch(source, candidate);
  if (displayNameMatch) {
    signals.push({
      type: 'display_name_match',
      weight: SIGNAL_WEIGHTS.display_name_match,
      detail: displayNameMatch,
    });
  }

  // Add any additional signals (e.g., from external systems)
  if (additionalSignals) {
    signals.push(...additionalSignals);
  }

  // Calculate total confidence (capped at 100)
  const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
  const confidence = Math.min(totalWeight, 100);

  // Determine merge status
  const mergeStatus = determineMergeStatus(confidence, signals);

  // Generate human-readable reasoning
  const confidenceReasoning = generateReasoning(confidence, signals, mergeStatus);

  return {
    confidence,
    mergeStatus,
    confidenceReasoning,
    evidenceBreakdown: signals,
    humanReviewRequired: mergeStatus === 'candidate',
  };
}

// ── Merge Status Determination ───────────────────────────────

function determineMergeStatus(
  confidence: number,
  signals: EvidenceSignal[],
): 'active' | 'candidate' | 'independent' {
  // Design rule: no single signal below 35 may reach auto-merge alone
  const hasStrongSignal = signals.some(
    (s) => s.weight >= 35 && s.type !== 'face_similarity',
  );

  if (confidence >= AUTO_MERGE_THRESHOLD && hasStrongSignal) {
    return 'active';
  }

  if (confidence >= CANDIDATE_THRESHOLD) {
    return 'candidate';
  }

  return 'independent';
}

// ── Reasoning Generator ──────────────────────────────────────

function generateReasoning(
  confidence: number,
  signals: EvidenceSignal[],
  mergeStatus: string,
): string {
  if (signals.length === 0) {
    return 'No matching signals found between creators.';
  }

  const signalDescriptions = signals
    .sort((a, b) => b.weight - a.weight)
    .map((s) => `${s.type} (${s.weight}pts): ${s.detail}`)
    .join('; ');

  switch (mergeStatus) {
    case 'active':
      return `Auto-merge: confidence ${confidence}/100 exceeds threshold. Strong signals: ${signalDescriptions}`;
    case 'candidate':
      return `Candidate for review: confidence ${confidence}/100. Signals: ${signalDescriptions}`;
    default:
      return `Independent: confidence ${confidence}/100 below threshold. Signals logged for future re-evaluation: ${signalDescriptions}`;
  }
}

// ── Signal Detection Functions ───────────────────────────────

function findSharedVerifiedContact(
  source: CreatorIdentityData,
  candidate: CreatorIdentityData,
): string | null {
  const sourceEmails = new Set(source.emails?.map((e) => e.toLowerCase()) ?? []);
  const candidateEmails = candidate.emails?.map((e) => e.toLowerCase()) ?? [];

  for (const email of candidateEmails) {
    if (sourceEmails.has(email)) {
      return `Shared email: ${email}`;
    }
  }

  const sourcePhones = new Set(source.phoneNumbers ?? []);
  const candidatePhones = candidate.phoneNumbers ?? [];

  for (const phone of candidatePhones) {
    if (sourcePhones.has(phone)) {
      return `Shared phone/WhatsApp: ${phone}`;
    }
  }

  return null;
}

function findWebsiteOwnershipMatch(
  source: CreatorIdentityData,
  candidate: CreatorIdentityData,
): string | null {
  const sourceDomains = new Set(
    source.websites?.map((w) => extractDomain(w)) ?? [],
  );
  const candidateWebsites = candidate.websites ?? [];

  for (const website of candidateWebsites) {
    const domain = extractDomain(website);
    if (sourceDomains.has(domain)) {
      return `Shared website domain: ${domain}`;
    }
  }

  return null;
}

function findExplicitCrossMention(
  source: CreatorIdentityData,
  candidate: CreatorIdentityData,
): string | null {
  // Check if bio contains explicit claim of ownership
  const sourceBioLinks = source.bioLinks?.map((l) => l.toLowerCase()) ?? [];
  const candidateHandle = candidate.primaryHandle?.toLowerCase();

  if (candidateHandle) {
    for (const link of sourceBioLinks) {
      if (link.includes(candidateHandle)) {
        return `Bio links to candidate: ${link}`;
      }
    }
  }

  return null;
}

function findSharedLinktree(
  source: CreatorIdentityData,
  candidate: CreatorIdentityData,
): string | null {
  const linktreeDomains = ['linktr.ee', 'linktree.com', 'beacons.ai', 'lnk.bio'];
  const sourceLinks = source.socialLinks?.map((l) => l.toLowerCase()) ?? [];
  const candidateLinks = candidate.socialLinks?.map((l) => l.toLowerCase()) ?? [];

  for (const sourceLink of sourceLinks) {
    if (linktreeDomains.some((d) => sourceLink.includes(d))) {
      for (const candidateLink of candidateLinks) {
        if (linktreeDomains.some((d) => candidateLink.includes(d))) {
          if (extractPath(sourceLink) === extractPath(candidateLink)) {
            return `Shared link-in-bio: ${sourceLink}`;
          }
        }
      }
    }
  }

  return null;
}

function checkFaceSimilarity(
  source: CreatorIdentityData,
  candidate: CreatorIdentityData,
): string | null {
  // Face similarity is a supporting signal only (weight: 20)
  // Requires score >0.92 to be considered
  // Never allowed to be decisive alone
  const sourceFaceScore = source.platformData?.['face_similarity_score'] as number | undefined;
  const candidateFaceScore = candidate.platformData?.['face_similarity_score'] as number | undefined;

  if (sourceFaceScore && sourceFaceScore > 0.92 && candidateFaceScore && candidateFaceScore > 0.92) {
    return `Face similarity score: ${sourceFaceScore.toFixed(3)}`;
  }

  return null;
}

function checkUsernameMatch(
  source: CreatorIdentityData,
  candidate: CreatorIdentityData,
): string | null {
  const sourceHandle = normalizeHandle(source.primaryHandle ?? '');
  const candidateHandle = normalizeHandle(candidate.primaryHandle ?? '');

  if (sourceHandle && candidateHandle && sourceHandle === candidateHandle) {
    return `Identical handle: ${source.primaryHandle}`;
  }

  return null;
}

function findCrossMentionedHandle(
  source: CreatorIdentityData,
  candidate: CreatorIdentityData,
): string | null {
  // Check if source mentions candidate's handle in content
  const sourceContent = (source.platformData?.['recent_content'] as string[]) ?? [];
  const candidateHandle = candidate.primaryHandle?.toLowerCase();

  if (candidateHandle) {
    for (const content of sourceContent) {
      if (content.toLowerCase().includes(candidateHandle)) {
        return `Cross-mentioned in content: @${candidateHandle}`;
      }
    }
  }

  return null;
}

function checkStructuredMetadataMatch(
  source: CreatorIdentityData,
  candidate: CreatorIdentityData,
): string | null {
  // Check for matching business contact or other structured data
  const sourceBusinessContact = source.platformData?.['business_contact'] as string | undefined;
  const candidateBusinessContact = candidate.platformData?.['business_contact'] as string | undefined;

  if (sourceBusinessContact && candidateBusinessContact) {
    if (sourceBusinessContact.toLowerCase() === candidateBusinessContact.toLowerCase()) {
      return `Matching business contact: ${sourceBusinessContact}`;
    }
  }

  return null;
}

function checkDisplayNameMatch(
  source: CreatorIdentityData,
  candidate: CreatorIdentityData,
): string | null {
  const sourceName = source.displayName?.toLowerCase().trim();
  const candidateName = candidate.displayName?.toLowerCase().trim();

  if (sourceName && candidateName && sourceName === candidateName) {
    return `Exact display name match: ${source.displayName}`;
  }

  return null;
}

// ── Utility Functions ────────────────────────────────────────

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] ?? '';
  }
}

function extractPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url.split('/').slice(1).join('/');
  }
}

function normalizeHandle(handle: string): string {
  return handle.toLowerCase().replace(/^@/, '').trim();
}

// ── Manual Override ──────────────────────────────────────────

/**
 * Apply manual reviewer confirmation (overrides to 100).
 * Used when a human reviewer has already confirmed the match.
 */
export function applyManualConfirmation(
  score: IdentityScore,
  reviewerId: string,
  notes?: string,
): IdentityScore {
  return {
    confidence: 100,
    mergeStatus: 'active',
    confidenceReasoning: `Manual confirmation by reviewer ${reviewerId}${notes ? `: ${notes}` : ''}`,
    evidenceBreakdown: [
      ...score.evidenceBreakdown,
      {
        type: 'manual_reviewer_confirmation',
        weight: 100,
        detail: `Confirmed by ${reviewerId}`,
        source: reviewerId,
      },
    ],
    humanReviewRequired: false,
  };
}

// ── Minor Signal Detection (ADR-029 addendum) ────────────────

/**
 * Check if creator data contains age signals indicating potential minor.
 * ADR-029: Any evidence of age under 18 sets minor_signal = true.
 */
export function detectMinorSignal(creator: CreatorIdentityData): boolean {
  const bio = (creator.platformData?.['bio'] as string) ?? '';
  const age = creator.platformData?.['self_reported_age'] as number | undefined;

  // Check self-reported age
  if (age && age < 18) {
    return true;
  }

  // Check for age-related keywords in bio
  const agePatterns = [
    /\b(?:i'?m|iam|age)\s*(?:1[0-7]|[0-9])\b/i,
    /\b(?:minor|under\s*18|teenager?|teen)\b/i,
    /\b(?:grade\s*[0-9]|middle\s*school|high\s*sophomore|junior)\b/i,
  ];

  for (const pattern of agePatterns) {
    if (pattern.test(bio)) {
      return true;
    }
  }

  // Check platform designation
  const platformDesignation = creator.platformData?.['account_type'] as string | undefined;
  if (platformDesignation === 'minor' || platformDesignation === 'parental') {
    return true;
  }

  return false;
}
