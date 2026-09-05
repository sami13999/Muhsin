/**
 * Unit tests for Trending Service (trending_score computation).
 * Tests deterministic computation from snapshot history.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrendingService } from '../services/trending.service.js';

describe('TrendingService', () => {
  let service: TrendingService;
  let mockDb: { execute: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockDb = {
      execute: vi.fn(),
    };
    service = new TrendingService(mockDb as never);
  });

  describe('computeTrendingScore', () => {
    it('should return 0 for creator with insufficient snapshots', async () => {
      mockDb.execute.mockResolvedValue([
        {
          snapshot_id: 'snap-1',
          created_at: '2026-07-01T00:00:00Z',
          follower_count: 1000,
          engagement_rate: 0.05,
          quality_score: 0.7,
          authenticity_band: 'strong',
        },
        {
          snapshot_id: 'snap-2',
          created_at: '2026-07-05T00:00:00Z',
          follower_count: 1100,
          engagement_rate: 0.055,
          quality_score: 0.72,
          authenticity_band: 'strong',
        },
      ]);

      const result = await service.computeTrendingScore('creator-1');

      expect(result.score).toBe(0);
      expect(result.trendDirection).toBe('steady');
    });

    it('should compute positive score for accelerating creator', async () => {
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
          created_at: '2026-06-15T00:00:00Z',
          follower_count: 1200,
          engagement_rate: 0.06,
          quality_score: 0.65,
          authenticity_band: 'moderate',
        },
        {
          snapshot_id: 'snap-3',
          created_at: '2026-07-01T00:00:00Z',
          follower_count: 1800,
          engagement_rate: 0.09,
          quality_score: 0.8,
          authenticity_band: 'strong',
        },
      ]);

      const result = await service.computeTrendingScore('creator-1');

      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(result.trendDirection).toBe('accelerating');
      expect(result.inputs.followerAcceleration).toBeGreaterThan(0);
    });

    it('should compute lower score for decelerating creator', async () => {
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
          created_at: '2026-06-15T00:00:00Z',
          follower_count: 2000,
          engagement_rate: 0.10,
          quality_score: 0.8,
          authenticity_band: 'strong',
        },
        {
          snapshot_id: 'snap-3',
          created_at: '2026-07-01T00:00:00Z',
          follower_count: 2100,
          engagement_rate: 0.105,
          quality_score: 0.82,
          authenticity_band: 'strong',
        },
      ]);

      const result = await service.computeTrendingScore('creator-1');

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.trendDirection).toBe('decelerating');
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
          created_at: '2026-06-15T00:00:00Z',
          follower_count: 1500,
          engagement_rate: 0.07,
          quality_score: 0.7,
          authenticity_band: 'strong',
        },
        {
          snapshot_id: 'snap-3',
          created_at: '2026-07-01T00:00:00Z',
          follower_count: 2500,
          engagement_rate: 0.10,
          quality_score: 0.85,
          authenticity_band: 'strong',
        },
      ];

      mockDb.execute.mockResolvedValue(snapshots);

      const result1 = await service.computeTrendingScore('creator-1');
      const result2 = await service.computeTrendingScore('creator-1');

      expect(result1.score).toBe(result2.score);
      expect(result1.trendDirection).toBe(result2.trendDirection);
    });

    it('should include computedAt timestamp', async () => {
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
          created_at: '2026-06-15T00:00:00Z',
          follower_count: 1500,
          engagement_rate: 0.07,
          quality_score: 0.7,
          authenticity_band: 'strong',
        },
        {
          snapshot_id: 'snap-3',
          created_at: '2026-07-01T00:00:00Z',
          follower_count: 2500,
          engagement_rate: 0.10,
          quality_score: 0.85,
          authenticity_band: 'strong',
        },
      ]);

      const result = await service.computeTrendingScore('creator-1');

      expect(result.computedAt).toBeDefined();
      expect(new Date(result.computedAt).getTime()).toBeLessThanOrEqual(Date.now());
    });
  });
});
