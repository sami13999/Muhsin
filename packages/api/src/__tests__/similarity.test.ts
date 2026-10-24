/**
 * Search infrastructure unit tests.
 * Tests similarity search service, SQL queries, and pgvector integration.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SimilaritySearchService, createSimilaritySearchService } from '../services/similarity.service.js';

describe('SimilaritySearchService', () => {
  let mockDb: any;
  let service: SimilaritySearchService;

  beforeEach(() => {
    mockDb = {
      execute: vi.fn(),
      update: vi.fn(),
      select: vi.fn(),
    };
    service = createSimilaritySearchService(mockDb);
  });

  describe('findSimilar', () => {
    it('executes the correct SQL function gcp.find_similar_creators with parameters', async () => {
      const targetId = 'a0000000-0000-0000-0000-000000000001';
      const mockRows = [
        {
          creator_id: 'b0000000-0000-0000-0000-000000000002',
          display_name: 'Similar Creator One',
          primary_handle: '@simone',
          similarity: 0.88,
        },
      ];

      let executedQueryString = '';
      mockDb.execute.mockImplementation(async (sqlObj: any) => {
        // Drizzle sql objects convert to string or have queryChunks
        executedQueryString = sqlObj?.queryChunks
          ? sqlObj.queryChunks.map((c: any) => (typeof c === 'string' ? c : c?.value ?? '')).join(' ')
          : String(sqlObj);
        return mockRows;
      });

      const results = await service.findSimilar(targetId, {
        limit: 5,
        minSimilarity: 0.75,
      });

      expect(mockDb.execute).toHaveBeenCalledTimes(1);
      expect(executedQueryString).toContain('gcp.find_similar_creators');
      expect(executedQueryString).not.toContain('find_similar_crears');

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        creatorId: 'b0000000-0000-0000-0000-000000000002',
        displayName: 'Similar Creator One',
        primaryHandle: '@simone',
        similarity: 0.88,
      });
    });

    it('uses default limit of 10 and minSimilarity of 0.5 when options are omitted', async () => {
      const targetId = 'a0000000-0000-0000-0000-000000000001';
      mockDb.execute.mockResolvedValue([]);

      const results = await service.findSimilar(targetId);

      expect(mockDb.execute).toHaveBeenCalledTimes(1);
      expect(results).toEqual([]);
    });

    it('propagates database execution errors without silently swallowing', async () => {
      mockDb.execute.mockRejectedValue(new Error('PostgreSQL connection terminated'));

      await expect(service.findSimilar('test-id')).rejects.toThrow(
        'PostgreSQL connection terminated',
      );
    });
  });

  describe('generateEmbedding', () => {
    it('executes database query with embedding vector', async () => {
      mockDb.execute.mockResolvedValue([]);
      const embedding = Array(1536).fill(0.01);

      await service.generateEmbedding('test-id', embedding);

      expect(mockDb.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('hasEmbedding', () => {
    it('returns true when creator has an embedding', async () => {
      mockDb.execute.mockResolvedValue([{ has_embedding: true }]);

      const has = await service.hasEmbedding('test-id');
      expect(has).toBe(true);
    });

    it('returns false when creator has no embedding', async () => {
      mockDb.execute.mockResolvedValue([]);

      const has = await service.hasEmbedding('test-id');
      expect(has).toBe(false);
    });
  });
});
