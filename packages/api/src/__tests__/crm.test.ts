/**
 * CRM service unit tests.
 * Tests lists, tags, and campaign management.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CRMService, createCRMService } from '../services/crm.service.js';
import { createMockDatabase } from '@mushin/testing';

describe('CRMService', () => {
  let service: CRMService;
  let mockDb: ReturnType<typeof createMockDatabase>;

  beforeEach(() => {
    mockDb = createMockDatabase();
    service = createCRMService(mockDb as any);
  });

  describe('Factory', () => {
    it('should create service with database', () => {
      expect(service).toBeInstanceOf(CRMService);
    });
  });

  describe('Lists', () => {
    it('should implement createList method', () => {
      expect(typeof service.createList).toBe('function');
    });

    it('should implement getList method', () => {
      expect(typeof service.getList).toBe('function');
    });

    it('should implement listLists method', () => {
      expect(typeof service.listLists).toBe('function');
    });

    it('should implement archiveList method', () => {
      expect(typeof service.archiveList).toBe('function');
    });
  });

  describe('List Members', () => {
    it('should implement addListMember method', () => {
      expect(typeof service.addListMember).toBe('function');
    });

    it('should implement removeListMember method', () => {
      expect(typeof service.removeListMember).toBe('function');
    });

    it('should implement getListMembers method', () => {
      expect(typeof service.getListMembers).toBe('function');
    });
  });

  describe('Tags', () => {
    it('should implement addTags method', () => {
      expect(typeof service.addTags).toBe('function');
    });

    it('should implement removeTags method', () => {
      expect(typeof service.removeTags).toBe('function');
    });

    it('should implement getWorkspaceTags method', () => {
      expect(typeof service.getWorkspaceTags).toBe('function');
    });
  });
});
