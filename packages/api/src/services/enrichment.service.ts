/**
 * AI Enrichment Service — Creator intelligence scoring.
 *
 * Produces enrichment snapshots for:
 * - Authenticity (bot detection, engagement quality)
 * - Quality (content quality, consistency)
 * - Audience estimates (demographics, geography)
 *
 * Source: Doc 15 (AI/Search/Discovery), ADR-028 (Provenance Triple)
 */
import { z } from 'zod';
import type { Database } from '@mushin/database';
import type { LLMAdapter } from '@mushin/adapters';
import { enrichmentSnapshot, creator } from '@mushin/database';
import { sql } from 'drizzle-orm';

// ── Types ────────────────────────────────────────────────────

export type SnapshotType = 'authenticity' | 'quality' | 'audience_estimate';

export interface EnrichmentInput {
  creatorId: string;
  profileData: Record<string, unknown>;
  platformMetrics: Record<string, unknown>;
  recentContent?: string[];
}

export interface AuthenticityVerdict {
  band: 'strong' | 'moderate' | 'weak' | 'unknown';
  score: number; // 0-100
  signals: string[];
  concerns: string[];
}

export interface QualityVerdict {
  score: number; // 0-100
  consistency: number; // 0-100
  engagementQuality: number; // 0-100
  contentQuality: number; // 0-100
}

export interface AudienceVerdict {
  pkShare: number; // 0-1, Pakistan audience share
  gccShare: number; // 0-1, GCC audience share
  diasporaShare: number; // 0-1, diaspora audience share
  languageMix: Record<string, number>; // language -> share
  topCountries: Array<{ country: string; share: number }>;
}

export interface EnrichmentResult {
  success: boolean;
  snapshotType: SnapshotType;
  verdict: AuthenticityVerdict | QualityVerdict | AudienceVerdict;
  confidenceLevel: 'high' | 'medium' | 'low';
  promptVersion: string;
  modelVersion: string;
  contentHash: string;
  error?: string;
}

// ── Configuration ────────────────────────────────────────────

const PROMPT_VERSIONS: Record<SnapshotType, string> = {
  authenticity: 'v1.0.0',
  quality: 'v1.0.0',
  audience_estimate: 'v1.0.0',
};

// ── Service ──────────────────────────────────────────────────

export class EnrichmentService {
  private db: Database;
  private llm: LLMAdapter;

  constructor(db: Database, llm: LLMAdapter) {
    this.db = db;
    this.llm = llm;
  }

  /**
   * Generate authenticity score for a creator.
   * Detects bot activity, engagement manipulation, etc.
   */
  async generateAuthenticityScore(input: EnrichmentInput): Promise<EnrichmentResult> {
    const systemPrompt = `Analyze this creator's data for authenticity. Look for:
- Engagement rate anomalies (too high or too low)
- Follower growth patterns
- Content consistency
- Bot-like behavior signals
- Engagement quality (meaningful vs spam)

Return JSON with: { band: "strong"|"moderate"|"weak"|"unknown", score: 0-100, signals: string[], concerns: string[] }`;

    const userMessage = JSON.stringify({
      profileData: input.profileData,
      platformMetrics: input.platformMetrics,
      recentContent: input.recentContent?.slice(0, 5),
    });

    const result = await this.llm.call('T-B', systemPrompt, userMessage, z.object({
      band: z.enum(['strong', 'moderate', 'weak', 'unknown']),
      score: z.number().min(0).max(100),
      signals: z.array(z.string()),
      concerns: z.array(z.string()),
    }));

    if (!result.success) {
      return {
        success: false,
        snapshotType: 'authenticity',
        verdict: { band: 'unknown', score: 0, signals: [], concerns: [] },
        confidenceLevel: 'low',
        promptVersion: PROMPT_VERSIONS.authenticity,
        modelVersion: 'unknown',
        contentHash: '',
        error: result.error,
      };
    }

    const verdict: AuthenticityVerdict = result.data;
    const contentHash = await this.computeHash(userMessage);

    // Store snapshot
    await this.storeSnapshot(input.creatorId, 'authenticity', verdict, {
      promptVersion: PROMPT_VERSIONS.authenticity,
      modelVersion: result.response.model,
      contentHash,
    });

    return {
      success: true,
      snapshotType: 'authenticity',
      verdict,
      confidenceLevel: verdict.score > 70 ? 'high' : verdict.score > 40 ? 'medium' : 'low',
      promptVersion: PROMPT_VERSIONS.authenticity,
      modelVersion: result.response.model,
      contentHash,
    };
  }

  /**
   * Generate quality score for a creator.
   * Evaluates content quality, consistency, engagement quality.
   */
  async generateQualityScore(input: EnrichmentInput): Promise<EnrichmentResult> {
    const systemPrompt = `Analyze this creator's content quality. Evaluate:
- Content consistency (posting frequency, style)
- Engagement quality (meaningful interactions)
- Professional presentation
- Niche relevance

Return JSON with: { score: 0-100, consistency: 0-100, engagementQuality: 0-100, contentQuality: 0-100 }`;

    const userMessage = JSON.stringify({
      profileData: input.profileData,
      platformMetrics: input.platformMetrics,
      recentContent: input.recentContent?.slice(0, 10),
    });

    const result = await this.llm.call('T-A', systemPrompt, userMessage, z.object({
      score: z.number().min(0).max(100),
      consistency: z.number().min(0).max(100),
      engagementQuality: z.number().min(0).max(100),
      contentQuality: z.number().min(0).max(100),
    }));

    if (!result.success) {
      return {
        success: false,
        snapshotType: 'quality',
        verdict: { score: 0, consistency: 0, engagementQuality: 0, contentQuality: 0 },
        confidenceLevel: 'low',
        promptVersion: PROMPT_VERSIONS.quality,
        modelVersion: 'unknown',
        contentHash: '',
        error: result.error,
      };
    }

    const verdict: QualityVerdict = result.data;
    const contentHash = await this.computeHash(userMessage);

    await this.storeSnapshot(input.creatorId, 'quality', verdict, {
      promptVersion: PROMPT_VERSIONS.quality,
      modelVersion: result.response.model,
      contentHash,
    });

    return {
      success: true,
      snapshotType: 'quality',
      verdict,
      confidenceLevel: verdict.score > 70 ? 'high' : verdict.score > 40 ? 'medium' : 'low',
      promptVersion: PROMPT_VERSIONS.quality,
      modelVersion: result.response.model,
      contentHash,
    };
  }

  /**
   * Generate audience estimates for a creator.
   * Estimates demographics, geography, language distribution.
   */
  async generateAudienceEstimates(input: EnrichmentInput): Promise<EnrichmentResult> {
    const systemPrompt = `Estimate this creator's audience demographics based on available data.
Focus on Pakistan market relevance:
- pkShare: estimated Pakistan audience share (0-1)
- gccShare: estimated GCC audience share (0-1)
- diasporaShare: estimated diaspora audience share (0-1)
- languageMix: { "urdu": 0.4, "english": 0.3, ... }
- topCountries: [{ "country": "PK", "share": 0.4 }, ...]

Return JSON with these fields.`;

    const userMessage = JSON.stringify({
      profileData: input.profileData,
      platformMetrics: input.platformMetrics,
    });

    const result = await this.llm.call('T-B', systemPrompt, userMessage, z.object({
      pkShare: z.number().min(0).max(1),
      gccShare: z.number().min(0).max(1),
      diasporaShare: z.number().min(0).max(1),
      languageMix: z.record(z.number()),
      topCountries: z.array(z.object({ country: z.string(), share: z.number() })),
    }));

    if (!result.success) {
      return {
        success: false,
        snapshotType: 'audience_estimate',
        verdict: { pkShare: 0, gccShare: 0, diasporaShare: 0, languageMix: {}, topCountries: [] },
        confidenceLevel: 'low',
        promptVersion: PROMPT_VERSIONS.audience_estimate,
        modelVersion: 'unknown',
        contentHash: '',
        error: result.error,
      };
    }

    const verdict: AudienceVerdict = result.data;
    const contentHash = await this.computeHash(userMessage);

    await this.storeSnapshot(input.creatorId, 'audience_estimate', verdict, {
      promptVersion: PROMPT_VERSIONS.audience_estimate,
      modelVersion: result.response.model,
      contentHash,
    });

    return {
      success: true,
      snapshotType: 'audience_estimate',
      verdict,
      confidenceLevel: 'medium',
      promptVersion: PROMPT_VERSIONS.audience_estimate,
      modelVersion: result.response.model,
      contentHash,
    };
  }

  /**
   * Run all enrichment types for a creator.
   */
  async enrichCreator(input: EnrichmentInput): Promise<EnrichmentResult[]> {
    const results = await Promise.all([
      this.generateAuthenticityScore(input),
      this.generateQualityScore(input),
      this.generateAudienceEstimates(input),
    ]);

    return results;
  }

  // ── Private Helpers ────────────────────────────────────────

  private async storeSnapshot(
    creatorId: string,
    snapshotType: SnapshotType,
    verdict: unknown,
    meta: { promptVersion: string; modelVersion: string; contentHash: string },
  ): Promise<void> {
    // Mark previous snapshots as not current
    await this.db.execute(sql`
      UPDATE gcp.enrichment_snapshot
      SET is_current = false
      WHERE creator_id = ${creatorId}
        AND snapshot_type = ${snapshotType}
        AND is_current = true
    `);

    // Insert new snapshot
    await this.db.insert(enrichmentSnapshot).values({
      creatorId,
      snapshotType,
      verdict,
      evidenceBreakdown: {},
      confidenceLevel: 'medium',
      dataBasisStatement: 'AI-generated from profile and metrics data',
      promptVersion: meta.promptVersion,
      modelVersion: meta.modelVersion,
      contentHash: meta.contentHash,
      isCurrent: true,
    });
  }

  private async computeHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
}

// ── Factory ──────────────────────────────────────────────────

export function createEnrichmentService(db: Database, llm: LLMAdapter): EnrichmentService {
  return new EnrichmentService(db, llm);
}
