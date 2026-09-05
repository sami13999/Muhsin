/**
 * Analytics service unit tests.
 * Tests workspace analytics, creator analytics, benchmarking, and exports.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalyticsService, createAnalyticsService } from '../services/analytics.service.js';
import { createMockDatabase } from '@mushin/testing';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let mockDb: ReturnType<typeof createMockDatabase>;

  beforeEach(() => {
    mockDb = createMockDatabase();
    service = createAnalyticsService(mockDb as any);
  });

  describe('Factory', () => {
    it('should create service with database', () => {
      expect(service).toBeInstanceOf(AnalyticsService);
    });
  });

  describe('Interface', () => {
    it('should implement getWorkspaceAnalytics method', () => {
      expect(typeof service.getWorkspaceAnalytics).toBe('function');
    });

    it('should implement getCreatorAnalytics method', () => {
      expect(typeof service.getCreatorAnalytics).toBe('function');
    });

    it('should implement getBenchmark method', () => {
      expect(typeof service.getBenchmark).toBe('function');
    });

    it('should implement exportCreators method', () => {
      expect(typeof service.exportCreators).toBe('function');
    });
  });
});
