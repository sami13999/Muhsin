import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MeilisearchAdapter, type MeilisearchDocument } from '../meilisearch/adapter.js';

// Mock meilisearch client
const mockAddDocuments = vi.fn().mockResolvedValue({ taskUid: 1 });
const mockDeleteDocument = vi.fn().mockResolvedValue({ taskUid: 4 });
const mockUpdateSettings = vi.fn().mockResolvedValue({ taskUid: 2 });
const mockGetStats = vi.fn().mockResolvedValue({ numberOfDocuments: 10 });
const mockCreateIndex = vi.fn().mockResolvedValue({ taskUid: 3 });
const mockHealth = vi.fn().mockResolvedValue({ status: 'available' });
const mockGetRawInfo = vi.fn().mockResolvedValue({ uid: 'creators', primaryKey: 'creatorId' });
const mockSearch = vi.fn().mockResolvedValue({ hits: [], totalHits: 0 });

vi.mock('meilisearch', () => {
  return {
    MeiliSearch: vi.fn().mockImplementation(() => ({
      health: mockHealth,
      createIndex: mockCreateIndex,
      index: vi.fn().mockReturnValue({
        addDocuments: mockAddDocuments,
        deleteDocument: mockDeleteDocument,
        updateSettings: mockUpdateSettings,
        getStats: mockGetStats,
        getRawInfo: mockGetRawInfo,
        search: mockSearch,
      }),
    })),
  };
});

describe('MeilisearchAdapter Primary Key Contract (Step 2B / 2B.1)', () => {
  let adapter: MeilisearchAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRawInfo.mockResolvedValue({ uid: 'creators', primaryKey: 'creatorId' });
    mockDeleteDocument.mockResolvedValue({ taskUid: 4 });
    mockAddDocuments.mockResolvedValue({ taskUid: 1 });
    adapter = new MeilisearchAdapter({
      host: 'http://localhost:7700',
      apiKey: 'test-master-key',
      indexName: 'creators',
    });
  });

  const validDoc: MeilisearchDocument = {
    creatorId: 'crt-test-123',
    id: 'crt-test-123',
    displayName: 'Test Creator',
    primaryHandle: '@test',
    handleVariants: ['test'],
    platform: 'youtube',
    canonicalUrl: 'https://youtube.com/@test',
    followerCount: 100000,
    engagementRate: 0.05,
    lastPostAt: null,
    primaryNiche: 'tech',
    secondaryNiches: [],
    authenticityBand: 'strong',
    authenticityScore: 90,
    qualityScore: 85,
    audiencePkShare: 0.7,
    audienceGccShare: 0.2,
    audienceDiasporaShare: 0.1,
    languageMix: { urdu: 0.8, english: 0.2 },
    summary: 'Tech creator',
    audienceFemalePercent: 40,
    audienceMalePercent: 60,
    audienceAgeBands: null,
    audienceCities: null,
    audienceCountries: null,
    risingScore: null,
    completenessTier: 'rich',
    enrichmentSource: 'youtube_data_api_v3',
    lastEnrichedAt: null,
    indexProjectionVersion: 1,
  };

  it('REGRESSION: configureIndex MUST ensure index is created with primaryKey: creatorId', async () => {
    const result = await adapter.configureIndex();

    expect(mockCreateIndex).toHaveBeenCalledWith('creators', { primaryKey: 'creatorId' });
    expect(mockUpdateSettings).toHaveBeenCalled();
    expect(result.created).toBe(true);
    expect(result.primaryKey).toBe('creatorId');
    expect(result.mismatchDetected).toBe(false);
  });

  it('EXISTING INDEX COMPATIBILITY: configureIndex detects pre-existing index with primaryKey "id" without assuming it changed', async () => {
    // Simulate pre-existing index where createIndex throws (index already exists) and existing primaryKey is 'id'
    mockCreateIndex.mockRejectedValueOnce(new Error('Index already exists'));
    mockGetRawInfo.mockResolvedValueOnce({ uid: 'creators', primaryKey: 'id' });

    const result = await adapter.configureIndex();

    expect(result.created).toBe(false);
    expect(result.primaryKey).toBe('id');
    expect(result.mismatchDetected).toBe(true);
    expect(result.warning).toBeDefined();
    expect(result.warning).toContain("already exists with primary key 'id'");
    // Verify updateSettings was still executed
    expect(mockUpdateSettings).toHaveBeenCalled();
  });

  it('EXISTING INDEX COMPATIBILITY: getPrimaryKey returns current primaryKey of the index', async () => {
    mockGetRawInfo.mockResolvedValueOnce({ uid: 'creators', primaryKey: 'id' });
    const pk = await adapter.getPrimaryKey();
    expect(pk).toBe('id');
  });

  it('REGRESSION: createIndexIfNotExists MUST create index with primaryKey: creatorId', async () => {
    await adapter.createIndexIfNotExists('custom_creators', { platform: 'filterable' });

    expect(mockCreateIndex).toHaveBeenCalledWith('custom_creators', { primaryKey: 'creatorId' });
    expect(mockUpdateSettings).toHaveBeenCalled();
  });

  it('REGRESSION: upsertDocument MUST supply { primaryKey: creatorId } to addDocuments', async () => {
    const result = await adapter.upsertDocument(validDoc);

    expect(result.status).toBe('success');
    expect(mockAddDocuments).toHaveBeenCalledWith([validDoc], { primaryKey: 'creatorId' });
  });

  it('REGRESSION: upsertDocuments MUST supply { primaryKey: creatorId } to addDocuments', async () => {
    const result = await adapter.upsertDocuments([validDoc]);

    expect(result.status).toBe('success');
    expect(mockAddDocuments).toHaveBeenCalledWith([validDoc], { primaryKey: 'creatorId' });
  });

  it('REGRESSION: upsertDocumentToIndex MUST supply { primaryKey: creatorId } to addDocuments', async () => {
    const result = await adapter.upsertDocumentToIndex('creators', validDoc as unknown as Record<string, unknown>);

    expect(result.status).toBe('success');
    expect(mockAddDocuments).toHaveBeenCalledWith([validDoc], { primaryKey: 'creatorId' });
  });

  it('should enforce that valid documents have creatorId defined', () => {
    // Regression check: Meilisearch rejected documents that lacked the primaryKey attribute
    expect(validDoc.creatorId).toBeDefined();
    expect(typeof validDoc.creatorId).toBe('string');
    expect(validDoc.creatorId.length).toBeGreaterThan(0);
  });

  it('REGRESSION: upsertDocument MUST reject document missing creatorId with error status', async () => {
    const invalidDoc = { ...validDoc, creatorId: '' };
    const result = await adapter.upsertDocument(invalidDoc);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error).toContain('missing required primary key: creatorId');
    }
    expect(mockAddDocuments).not.toHaveBeenCalled();
  });

  it('REGRESSION: upsertDocuments MUST reject batch if any document is missing creatorId', async () => {
    const invalidDoc = { ...validDoc, creatorId: undefined as any };
    const result = await adapter.upsertDocuments([validDoc, invalidDoc]);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error).toContain('missing required primary key: creatorId');
    }
    expect(mockAddDocuments).not.toHaveBeenCalled();
  });

  it('REGRESSION: upsertDocument automatically derives compatibility alias id from creatorId', async () => {
    const docWithoutId: MeilisearchDocument = { ...validDoc, id: undefined };
    const result = await adapter.upsertDocument(docWithoutId);

    expect(result.status).toBe('success');
    expect(mockAddDocuments).toHaveBeenCalledWith(
      [expect.objectContaining({ creatorId: 'crt-test-123', id: 'crt-test-123' })],
      { primaryKey: 'creatorId' },
    );
  });

  it('CANONICAL KEY ENFORCEMENT: upsertDocumentToIndex MUST reject an id-only document missing creatorId', async () => {
    // Step 2B.1 rule: do NOT silently accept an id-only document and derive creatorId from it
    const idOnlyDoc = { id: 'legacy-creator-999', displayName: 'Legacy' };
    const result = await adapter.upsertDocumentToIndex('creators', idOnlyDoc);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error).toBe('Document missing required primary key: creatorId');
    }
    expect(mockAddDocuments).not.toHaveBeenCalled();
  });

  it('CANONICAL KEY ENFORCEMENT: upsertDocumentToIndex generates compatibility alias id derived from creatorId', async () => {
    const validDocWithoutId = { creatorId: 'crt-canonical-001', displayName: 'Canonical Creator' };
    const result = await adapter.upsertDocumentToIndex('creators', validDocWithoutId);

    expect(result.status).toBe('success');
    expect(mockAddDocuments).toHaveBeenCalledWith(
      [expect.objectContaining({ creatorId: 'crt-canonical-001', id: 'crt-canonical-001' })],
      { primaryKey: 'creatorId' },
    );
  });

  it('REGRESSION: upsertDocumentToIndex rejects document missing creatorId even if empty string', async () => {
    const invalidDoc = { creatorId: '   ', displayName: 'Blank Key' };
    const result = await adapter.upsertDocumentToIndex('creators', invalidDoc);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error).toBe('Document missing required primary key: creatorId');
    }
    expect(mockAddDocuments).not.toHaveBeenCalled();
  });

  describe('GDPR Erasure & Document Deletion Sync (Step 2B.2)', () => {
    it('deleteDocument deletes document using canonical creatorId', async () => {
      const result = await adapter.deleteDocument('crt-test-123');

      expect(result.status).toBe('success');
      expect(mockDeleteDocument).toHaveBeenCalledWith('crt-test-123');
      if (result.status === 'success') {
        expect(result.cost.operation).toBe('index_delete');
      }
    });

    it('CANONICAL KEY ENFORCEMENT: deleteDocument rejects missing or blank creatorId', async () => {
      const resultEmpty = await adapter.deleteDocument('');
      expect(resultEmpty.status).toBe('error');
      if (resultEmpty.status === 'error') {
        expect(resultEmpty.error).toBe('Document missing required primary key: creatorId');
      }

      const resultWhitespace = await adapter.deleteDocument('   ');
      expect(resultWhitespace.status).toBe('error');
      if (resultWhitespace.status === 'error') {
        expect(resultWhitespace.error).toBe('Document missing required primary key: creatorId');
      }

      expect(mockDeleteDocument).not.toHaveBeenCalled();
    });

    it('IDEMPOTENCY: deleteDocument treats absent document (404/not found) as success', async () => {
      const notFoundErr = Object.assign(new Error('Document not found'), {
        code: 'document_not_found',
        status: 404,
      });
      mockDeleteDocument.mockRejectedValueOnce(notFoundErr);

      const result = await adapter.deleteDocument('crt-nonexistent-999');

      expect(result.status).toBe('success');
      expect(mockDeleteDocument).toHaveBeenCalledWith('crt-nonexistent-999');
    });

    it('TRANSIENT ERROR: deleteDocument retries and returns error status on persistent failure', async () => {
      mockDeleteDocument.mockRejectedValue(new Error('Network connection timeout'));

      const result = await adapter.deleteDocument('crt-retry-error');

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error).toContain('Network connection timeout');
      }
      expect(mockDeleteDocument).toHaveBeenCalledTimes(3); // 3 retry attempts
    });

    it('deleteDocumentFromIndex deletes document from specified index', async () => {
      const result = await adapter.deleteDocumentFromIndex('creators_v2', 'crt-custom-001');

      expect(result.status).toBe('success');
      expect(mockDeleteDocument).toHaveBeenCalledWith('crt-custom-001');
    });

    it('deleteDocumentFromIndex rejects empty creatorId', async () => {
      const result = await adapter.deleteDocumentFromIndex('creators_v2', '');

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error).toBe('Document missing required primary key: creatorId');
      }
    });

    it('IDEMPOTENCY: deleteDocumentFromIndex treats 404 as success', async () => {
      const notFoundErr = Object.assign(new Error('Index or document not found'), {
        code: 'index_not_found',
        status: 404,
      });
      mockDeleteDocument.mockRejectedValueOnce(notFoundErr);

      const result = await adapter.deleteDocumentFromIndex('creators', 'crt-absent');

      expect(result.status).toBe('success');
    });
  });

  describe('Search Operations & Empty Filter Handling (Step 2C Fixes F-02 & F-03)', () => {
    it('EMPTY FILTER OMISSION: search omits filter property when filters is undefined or empty', async () => {
      mockSearch.mockResolvedValueOnce({
        hits: [{ creatorId: 'crt-1', displayName: 'Creator 1' }],
        totalHits: 42,
      });

      const result = await adapter.search('ayesha');

      expect(result.status).toBe('success');
      expect(mockSearch).toHaveBeenCalledWith('ayesha', {
        limit: 20,
        offset: 0,
      });
      // Verify filter property was completely omitted
      const calledOptions = mockSearch.mock.calls[0]![1];
      expect(calledOptions).not.toHaveProperty('filter');
    });

    it('EMPTY FILTER OMISSION: search omits filter property when filters is whitespace string', async () => {
      mockSearch.mockResolvedValueOnce({
        hits: [],
        totalHits: 0,
      });

      await adapter.search('ayesha', '   ');

      const calledOptions = mockSearch.mock.calls[0]![1];
      expect(calledOptions).not.toHaveProperty('filter');
    });

    it('FILTER INCLUSION: search includes trimmed filter string when provided', async () => {
      mockSearch.mockResolvedValueOnce({
        hits: [{ creatorId: 'crt-1' }],
        totalHits: 1,
      });

      const result = await adapter.search('ayesha', '  platform = "youtube"  ', 10, 5);

      expect(result.status).toBe('success');
      expect(mockSearch).toHaveBeenCalledWith('ayesha', {
        limit: 10,
        offset: 5,
        filter: 'platform = "youtube"',
      });
    });

    it('PAGINATION TOTALS: search accurately returns totalHits and estimatedTotalHits', async () => {
      mockSearch.mockResolvedValueOnce({
        hits: [{ creatorId: 'crt-1' }, { creatorId: 'crt-2' }],
        estimatedTotalHits: 150,
      });

      const result = await adapter.search('tech');

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.hits).toHaveLength(2);
        expect(result.totalHits).toBe(150);
        expect(result.estimatedTotalHits).toBe(150);
      }
    });

    it('searchDocuments omits filter when filterParams has no valid values', async () => {
      mockSearch.mockResolvedValueOnce({
        hits: [],
        totalHits: 0,
      });

      await adapter.searchDocuments('creators', 'test', { nullField: null, undefField: undefined });

      const calledOptions = mockSearch.mock.calls[0]![1];
      expect(calledOptions).not.toHaveProperty('filter');
    });
  });
});


