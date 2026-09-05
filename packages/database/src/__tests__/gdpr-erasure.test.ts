/**
 * GDPR Erasure tests — ADR-025 compliant.
 * Tests PII nullification, tombstone markers, and re-ingestion blocking.
 */
import { describe, it, expect, vi } from 'vitest';
import { eraseCreator, isCreatorErased, isHandleBlocked } from '../repositories/creator.repository.js';

describe('GDPR Erasure (ADR-025)', () => {
  describe('eraseCreator', () => {
    it('should return not_found for non-existent creator', async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      };

      const result = await eraseCreator(mockDb as any, 'nonexistent');

      expect(result).toBe('not_found');
    });

    it('should return already_erased for previously erased creator', async () => {
      // The first select returns both creatorId and displayName
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ creatorId: 'crt-001', displayName: '[ERASED]' }]),
            }),
          }),
        }),
      };

      const result = await eraseCreator(mockDb as any, 'crt-001');

      expect(result).toBe('already_erased');
    });

    it('should erase creator PII and return completed', async () => {
      const mockDb = {
        select: vi.fn()
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ creatorId: 'crt-001' }]),
              }),
            }),
          })
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ displayName: 'Test Creator' }]),
              }),
            }),
          }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue({}),
          }),
        }),
      };

      const result = await eraseCreator(mockDb as any, 'crt-001');

      expect(result).toBe('completed');
      // Verify PII nullification
      expect(mockDb.update).toHaveBeenCalledTimes(2);
    });
  });

  describe('isCreatorErased', () => {
    it('should return true for erased creator', async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ displayName: '[ERASED]' }]),
            }),
          }),
        }),
      };

      const result = await isCreatorErased(mockDb as any, 'crt-001');

      expect(result).toBe(true);
    });

    it('should return false for non-erased creator', async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ displayName: 'Test Creator' }]),
            }),
          }),
        }),
      };

      const result = await isCreatorErased(mockDb as any, 'crt-001');

      expect(result).toBe(false);
    });

    it('should return false for non-existent creator', async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      };

      const result = await isCreatorErased(mockDb as any, 'nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('isHandleBlocked', () => {
    it('should return true for erased handle', async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ handle: '[ERASED]' }]),
            }),
          }),
        }),
      };

      const result = await isHandleBlocked(mockDb as any, '@test', 'instagram');

      expect(result).toBe(true);
    });

    it('should return false for active handle', async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ handle: '@test' }]),
            }),
          }),
        }),
      };

      const result = await isHandleBlocked(mockDb as any, '@test', 'instagram');

      expect(result).toBe(false);
    });

    it('should return false for non-existent handle', async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      };

      const result = await isHandleBlocked(mockDb as any, '@nonexistent', 'instagram');

      expect(result).toBe(false);
    });
  });
});
