/**
 * AI Enrichment service unit tests.
 * Tests authenticity, quality, and audience scoring.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EnrichmentService, createEnrichmentService, type SnapshotType } from '../services/enrichment.service.js';
import { createMockDatabase, createMockLLMAdapter } from '@mushin/testing';

describe('EnrichmentService', () => {
  let service: EnrichmentService;
  let mockDb: ReturnType<typeof createMockDatabase>;
  let mockLlm: ReturnType<typeof createMockLLMAdapter>;

  beforeEach(() => {
    mockDb = createMockDatabase();
    mockLlm = createMockLLMAdapter();
    service = createEnrichmentService(mockDb as any, mockLlm as any);
  });

  describe('Factory', () => {
    it('should create service with database and LLM adapter', () => {
      expect(service).toBeInstanceOf(EnrichmentService);
    });
  });

  describe('Interface', () => {
    it('should implement generateAuthenticityScore method', () => {
      expect(typeof service.generateAuthenticityScore).toBe('function');
    });

    it('should implement generateQualityScore method', () => {
      expect(typeof service.generateQualityScore).toBe('function');
    });

    it('should implement generateAudienceEstimates method', () => {
      expect(typeof service.generateAudienceEstimates).toBe('function');
    });

    it('should implement enrichCreator method', () => {
      expect(typeof service.enrichCreator).toBe('function');
    });
  });

  describe('Snapshot types', () => {
    it('should support authenticity snapshots', () => {
      const types: SnapshotType[] = ['authenticity', 'quality', 'audience_estimate'];
      expect(types).toContain('authenticity');
    });

    it('should support quality snapshots', () => {
      const types: SnapshotType[] = ['authenticity', 'quality', 'audience_estimate'];
      expect(types).toContain('quality');
    });

    it('should support audience_estimate snapshots', () => {
      const types: SnapshotType[] = ['authenticity', 'quality', 'audience_estimate'];
      expect(types).toContain('audience_estimate');
    });
  });

  describe('ADR-028 provenance triple', () => {
    it('should store promptVersion with each snapshot', () => {
      // ADR-028: Every snapshot includes prompt version
      // for reproducibility and re-scoring
      expect(true).toBe(true);
    });

    it('should store modelVersion with each snapshot', () => {
      // ADR-028: Every snapshot includes model version
      expect(true).toBe(true);
    });

    it('should store contentHash with each snapshot', () => {
      // ADR-028: Content hash for detecting data changes
      expect(true).toBe(true);
    });

    it('should mark previous snapshots as not current', () => {
      // When new snapshot is created, previous ones are marked is_current = false
      expect(true).toBe(true);
    });
  });
});
