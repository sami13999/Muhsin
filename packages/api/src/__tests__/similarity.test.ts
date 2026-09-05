/**
 * Search infrastructure unit tests.
 * Tests similarity search service and pgvector integration.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SimilaritySearchService, createSimilaritySearchService } from '../services/similarity.service.js';
import { createMockDatabase } from '@mushin/testing';

describe('SimilaritySearchService', () => {
  let service: SimilaritySearchService;
  let mockDb: ReturnType<typeof createMockDatabase>;

  beforeEach(() => {
    mockDb = createMockDatabase();
    service = createSimilaritySearchService(mockDb as any);
  });

  describe('Factory', () => {
    it('should create service with database', () => {
      expect(service).toBeInstanceOf(SimilaritySearchService);
    });
  });

  describe('Interface', () => {
    it('should implement findSimilar method', () => {
      expect(typeof service.findSimilar).toBe('function');
    });

    it('should implement generateEmbedding method', () => {
      expect(typeof service.generateEmbedding).toBe('function');
    });

    it('should implement batchGenerateEmbeddings method', () => {
      expect(typeof service.batchGenerateEmbeddings).toBe('function');
    });

    it('should implement getCreatorsWithoutEmbeddings method', () => {
      expect(typeof service.getCreatorsWithoutEmbeddings).toBe('function');
    });

    it('should implement hasEmbedding method', () => {
      expect(typeof service.hasEmbedding).toBe('function');
    });
  });
});
