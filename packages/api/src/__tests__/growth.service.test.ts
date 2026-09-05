/**
 * Unit tests for Growth Service (rising_score computation).
 * Tests deterministic computation from snapshot history.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GrowthService } from '../services/growth.service.js';

describe('GrowthService', () => {
  let service: GrowthService;
  let mockDb: { execute: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockDb = {
      execute: vi.fn(),
    };
    service = new GrowthService(mockDb as never);
  });

  describe('computeRisingScore', () => {
    it('should return 0 for creator with no snapshots', async () => {
      mockDb.execute.mockResolvedValue([]);

      const result = await service.computeRisingScore('creator-1');

      expect(result.score).toBe(0);
      expect(result.inputs.followerGrowthVelocity).toBe(0);
      expect(result.inputs.engagementGrowthVelocity).toBe(0);
      expect(result.inputs.qualityScoreDelta).toBe(0);
      expect(result.inputs.authenticityTrendStability).toBe(0);
    });

    it('should return 0 for creator with only one snapshot', async () => {
      mockDb.execute.mockResolvedValue([
        {
          snapshot_id: 'snap-1',
          created_at: '2026-07-01T00:00:00Z',
          follower_count: 1000,
          engagement_rate: 0.05,
          quality_score: 0.7,
          authenticity_band: 'strong',
        },
      ]);

      const result = await service.computeRisingScore('creator-1');

      expect(result.score).toBe(0);
    });

    it('should compute positive score for growing creator', async () => {
      mockDb.execute.mockResolvedValue([
        {
          snapshot_id: 'snap-1',
          created_at: '2026-06-01T00:00:00Z',
          follower_count: 1000,
          engagement_rate: 0.05,
          quality_score: 0.6,
          authenticity_band: 'moderate',
        },
        {
          snapshot_id: 'snap-2',
          created_at: '2026-07-01T00:00:00Z',
          follower_count: 2000,
          engagement_rate: 0.08,
          quality_score: 0.8,
          authenticity_band: 'strong',
        },
      ]);

      const result = await service.computeRisingScore('creator-1');

      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(result.inputs.followerGrowthVelocity).toBeGreaterThan(0);
      expect(result.inputs.qualityScoreDelta).toBeGreaterThan(0);
    });

    it('should compute lower score for stagnant creator', async () => {
      mockDb.execute.mockResolvedValue([
        {
          snapshot_id: 'snap-1',
          created_at: '2026-06-01T00:00:00Z',
          follower_count: 1000,
          engagement_rate: 0.05,
          quality_score: 0.7,
          authenticity_band: 'strong',
        },
        {
          snapshot_id: 'snap-2',
          created_at: '2026-07-01T00:00:00Z',
          follower_count: 1000,
          engagement_rate: 0.05,
          quality_score: 0.7,
          authenticity_band: 'strong',
        },
      ]);

      const result = await service.computeRisingScore('creator-1');

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThan(1.0);
    });

    it('should return deterministic results for same input', async () => {
      const snapshots = [
        {
          snapshot_id: 'snap-1',
          created_at: '2026-06-01T00:00:00Z',
          follower_count: 1000,
          engagement_rate: 0.05,
          quality_score: 0.6,
          authenticity_band: 'moderate',
        },
        {
          snapshot_id: 'snap-2',
          created_at: '2026-07-01T00:00:00Z',
          follower_count: 2000,
          engagement_rate: 0.08,
          quality_score: 0.8,
          authenticity_band: 'strong',
        },
      ];

      mockDb.execute.mockResolvedValue(snapshots);

      const result1 = await service.computeRisingScore('creator-1');
      const result2 = await service.computeRisingScore('creator-1');

      expect(result1.score).toBe(result2.score);
      expect(result1.inputs).toEqual(result2.inputs);
    });
  });
});
