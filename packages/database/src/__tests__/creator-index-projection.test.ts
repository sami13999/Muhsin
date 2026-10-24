import { describe, it, expect, vi } from 'vitest';
import {
  buildCreatorIndexDocument,
  projectCreatorToIndex,
  deleteCreatorFromIndex,
  type CreatorIndexDocument,
} from '../projections/creator-index-projection.js';
import type { CreatorWithRelations } from '../repositories/creator.repository.js';

const { sampleCreatorData } = vi.hoisted(() => {
  const sampleCreatorData: CreatorWithRelations = {
    creator: {
      creatorId: 'crt-test-uuid-001',
      displayName: 'Test Creator',
      primaryHandle: '@testcreator',
      mergeStatus: 'active',
      mergedIntoCreatorId: null,
      mergeCandidateFor: null,
      mergeConfidence: null,
      indexPending: false,
      minorSignal: false,
      embedding: null,
      piiErasedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    },
    profiles: [
      {
        profileId: 'prf-001',
        creatorId: 'crt-test-uuid-001',
        platform: 'youtube',
        canonicalUrl: 'https://youtube.com/@testcreator',
        handle: '@testcreator',
        handleVariants: ['testcreator', 'test_creator'],
        enrichmentSource: 'youtube_data_api_v3',
        payloadCompletenessTier: 'rich',
        enrichmentStatus: 'fresh',
        enrichedAt: new Date('2026-01-02T10:00:00.000Z'),
        enrichmentTtlDays: 30,
        followerCount: 500000n,
        engagementRate: '0.045000',
        lastPostAt: new Date('2026-01-01T12:00:00.000Z'),
        ytSubscriberCount: 500000n,
        ytViewCount: 10000000n,
        ytVideoCount: 150,
        ytSubscriberToViewRatio: '0.05000000',
        ytAvgViewsPerVideo: '66666.67',
        platformMetrics: null,
        audienceDemographics: {
          gender: { female: 0.65, male: 0.35 },
          age: { '18-24': 0.3, '25-34': 0.45 },
          cities: { Karachi: 0.5, Lahore: 0.3 },
          countries: { Pakistan: 0.75, UAE: 0.15 },
        },
        scrapedPayloadRef: null,
        indexProjectionVersion: 1,
        piiErasedAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    ],
    enrichmentSnapshots: [
      {
        snapshotId: 'snp-001',
        creatorId: 'crt-test-uuid-001',
        snapshotType: 'authenticity',
        verdict: { band: 'strong', score: 92 },
        evidenceBreakdown: {},
        confidenceLevel: 'high',
        dataBasisStatement: 'Organic engagement verified',
        promptVersion: 'v1.0',
        modelVersion: 'claude-3-5-sonnet',
        contentHash: 'hash1',
        isCurrent: true,
        jobId: null,
        createdAt: new Date('2026-01-02T10:00:00.000Z'),
      },
      {
        snapshotId: 'snp-002',
        creatorId: 'crt-test-uuid-001',
        snapshotType: 'quality',
        verdict: { score: 88 },
        evidenceBreakdown: {},
        confidenceLevel: 'high',
        dataBasisStatement: 'High production quality',
        promptVersion: 'v1.0',
        modelVersion: 'claude-3-5-sonnet',
        contentHash: 'hash2',
        isCurrent: true,
        jobId: null,
        createdAt: new Date('2026-01-02T10:00:00.000Z'),
      },
    ],
    nicheClassifications: [
      {
        classificationId: 'nch-001',
        creatorId: 'crt-test-uuid-001',
        primaryNiche: 'technology',
        secondaryNiches: ['gadgets', 'software'],
        nicheConfidence: 'high',
        promptVersion: 'v1.0',
        classifiedAt: new Date('2026-01-02T10:00:00.000Z'),
        isCurrent: true,
      },
    ],
  };
  return { sampleCreatorData };
});

vi.mock('../repositories/creator.repository.js', async () => {
  const actual = await vi.importActual('../repositories/creator.repository.js');
  return {
    ...actual,
    findById: vi.fn().mockImplementation(async (_db, id: string) => {
      if (id === 'crt-test-uuid-001') {
        return sampleCreatorData;
      }
      if (id === 'crt-erased-pii') {
        return {
          ...sampleCreatorData,
          creator: {
            ...sampleCreatorData.creator,
            creatorId: 'crt-erased-pii',
            piiErasedAt: new Date('2026-02-01T00:00:00.000Z'),
          },
        };
      }
      if (id === 'crt-erased-tombstone') {
        return {
          ...sampleCreatorData,
          creator: {
            ...sampleCreatorData.creator,
            creatorId: 'crt-erased-tombstone',
            displayName: '[ERASED]',
            primaryHandle: '[ERASED]',
            piiErasedAt: null,
          },
        };
      }
      return null;
    }),
  };
});

describe('Creator Index Projection & Meilisearch Contract (Step 2B)', () => {
  it('REGRESSION: buildCreatorIndexDocument MUST contain valid creatorId matching primaryKey', () => {
    const doc: CreatorIndexDocument = buildCreatorIndexDocument(sampleCreatorData);

    // Primary key contract: creatorId MUST be defined and non-empty
    expect(doc).toHaveProperty('creatorId');
    expect(doc.creatorId).toBe('crt-test-uuid-001');

    // Backwards compatibility alias id MUST also be present and equal creatorId
    expect(doc).toHaveProperty('id');
    expect(doc.id).toBe('crt-test-uuid-001');
    expect(doc.id).toBe(doc.creatorId);

    // Verify critical identity & search attributes
    expect(doc.displayName).toBe('Test Creator');
    expect(doc.primaryHandle).toBe('@testcreator');
    expect(doc.platform).toBe('youtube');
    expect(doc.canonicalUrl).toBe('https://youtube.com/@testcreator');
    expect(doc.followerCount).toBe(500000);
    expect(doc.engagementRate).toBe(0.045);
    expect(doc.lastPostAt).toBe('2026-01-01T12:00:00.000Z');
    expect(doc.primaryNiche).toBe('technology');
    expect(doc.authenticityBand).toBe('strong');
    expect(doc.enrichmentSource).toBe('youtube_data_api_v3');
    expect(doc.indexProjectionVersion).toBe(1);
    expect(doc.completenessTier).toBe('rich');
  });

  it('should map audience demographics from dedicated audienceDemographics column', () => {
    const doc = buildCreatorIndexDocument(sampleCreatorData);

    expect(doc.audienceFemalePercent).toBe(65);
    expect(doc.audienceMalePercent).toBe(35);
    expect(doc.audienceAgeBands).toEqual({ '18-24': 0.3, '25-34': 0.45 });
    expect(doc.audienceCities).toEqual({ Karachi: 0.5, Lahore: 0.3 });
    expect(doc.audienceCountries).toEqual({ Pakistan: 0.75, UAE: 0.15 });
  });

  it('should fallback to platformMetrics.audience_demographics if audienceDemographics is null', () => {
    const legacyData: CreatorWithRelations = {
      ...sampleCreatorData,
      profiles: [
        {
          ...sampleCreatorData.profiles[0]!,
          audienceDemographics: null,
          platformMetrics: {
            audience_demographics: {
              gender: { female: 0.8, male: 0.2 },
              cities: { Islamabad: 0.6 },
            },
          },
        },
      ],
    };

    const doc = buildCreatorIndexDocument(legacyData);

    expect(doc.audienceFemalePercent).toBe(80);
    expect(doc.audienceMalePercent).toBe(20);
    expect(doc.audienceCities).toEqual({ Islamabad: 0.6 });
  });

  it('projectCreatorToIndex passes document containing creatorId to meilisearch.upsertDocument', async () => {
    const mockDb = {
      select: vi.fn(),
    };

    let submittedDocument: Record<string, unknown> | null = null;
    const mockMeilisearch = {
      upsertDocument: vi.fn().mockImplementation(async (_index: string, doc: Record<string, unknown>) => {
        submittedDocument = doc;
        return { success: true };
      }),
    };

    const result = await projectCreatorToIndex('crt-test-uuid-001', mockDb as any, mockMeilisearch);

    expect(result.success).toBe(true);
    expect(submittedDocument).not.toBeNull();
    // Regression check: the document sent to Meilisearch MUST have creatorId
    expect(submittedDocument!['creatorId']).toBe('crt-test-uuid-001');
    expect(submittedDocument!['id']).toBe('crt-test-uuid-001');
  });

  it('REGRESSION: document fails primary key contract if creatorId is missing or empty', () => {
    const doc = buildCreatorIndexDocument(sampleCreatorData);

    // Contract verification function
    function validateMeilisearchContract(document: { creatorId?: unknown; id?: unknown }): boolean {
      return (
        typeof document.creatorId === 'string' &&
        document.creatorId.trim().length > 0
      );
    }

    expect(validateMeilisearchContract(doc)).toBe(true);

    // Simulated regression: document without creatorId (the defect identified in audit)
    const brokenDoc = { ...doc };
    delete (brokenDoc as any).creatorId;
    expect(validateMeilisearchContract(brokenDoc)).toBe(false);

    // Empty creatorId should also fail
    const emptyKeyDoc = { ...doc, creatorId: '   ' };
    expect(validateMeilisearchContract(emptyKeyDoc)).toBe(false);
  });

  describe('GDPR Erasure Sync & Re-indexing Prevention (Step 2B.2)', () => {
    it('PREVENTION: projectCreatorToIndex blocks re-indexing when piiErasedAt is set', async () => {
      const mockDb = { select: vi.fn() };
      const mockUpsert = vi.fn().mockResolvedValue({ success: true });
      const mockMeilisearch = { upsertDocument: mockUpsert };

      const result = await projectCreatorToIndex('crt-erased-pii', mockDb as any, mockMeilisearch);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe('Creator is GDPR-erased');
      }
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it('PREVENTION: projectCreatorToIndex blocks re-indexing when tombstone displayName is [ERASED]', async () => {
      const mockDb = { select: vi.fn() };
      const mockUpsert = vi.fn().mockResolvedValue({ success: true });
      const mockMeilisearch = { upsertDocument: mockUpsert };

      const result = await projectCreatorToIndex('crt-erased-tombstone', mockDb as any, mockMeilisearch);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe('Creator is GDPR-erased');
      }
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it('deleteCreatorFromIndex calls meilisearch.deleteDocument with canonical creatorId', async () => {
      const mockDelete = vi.fn().mockResolvedValue({ status: 'success' });
      const mockMeilisearch = { deleteDocument: mockDelete };

      const result = await deleteCreatorFromIndex('crt-delete-123', mockMeilisearch);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.documentId).toBe('crt-delete-123');
      }
      expect(mockDelete).toHaveBeenCalledWith('crt-delete-123');
    });

    it('deleteCreatorFromIndex rejects empty creatorId', async () => {
      const mockDelete = vi.fn();
      const mockMeilisearch = { deleteDocument: mockDelete };

      const result = await deleteCreatorFromIndex('', mockMeilisearch);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toContain('missing or invalid');
      }
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it('deleteCreatorFromIndex handles deletion_deferred status cleanly', async () => {
      const mockDelete = vi.fn().mockResolvedValue({
        status: 'deletion_deferred',
        reason: 'Circuit breaker open',
      });
      const mockMeilisearch = { deleteDocument: mockDelete };

      const result = await deleteCreatorFromIndex('crt-deferred', mockMeilisearch);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe('Circuit breaker open');
      }
    });
  });
});

