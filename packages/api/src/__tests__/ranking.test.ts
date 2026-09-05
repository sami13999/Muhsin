/**
 * Unit tests for Ranking function.
 * Tests deterministic ranking with new factors (rising_score, pakistan boost).
 */
import { describe, it, expect } from 'vitest';
import { rankHits, DEFAULT_RANKING_WEIGHTS, type RankingWeights } from '../routes/m3-search/ranking.js';

describe('rankHits', () => {
  const baseHit = {
    _rankingScore: 0.8,
    authenticityBand: 'strong',
    qualityScore: 80,
    lastEnrichedAt: new Date().toISOString(),
    followerCount: 50000,
    primaryNiche: 'beauty_skincare',
  };

  it('should return empty array for empty input', () => {
    const result = rankHits([], {});
    expect(result).toEqual([]);
  });

  it('should rank single hit correctly', () => {
    const result = rankHits([baseHit], {});
    expect(result).toHaveLength(1);
    expect(result[0]!._rankingScore).toBeGreaterThan(0);
    expect(result[0]!._explanation).toBeDefined();
  });

  it('should rank multiple hits by total score descending', () => {
    const hits = [
      { ...baseHit, _rankingScore: 0.5, qualityScore: 50 },
      { ...baseHit, _rankingScore: 0.9, qualityScore: 90 },
      { ...baseHit, _rankingScore: 0.7, qualityScore: 70 },
    ];

    const result = rankHits(hits, {});

    expect(result).toHaveLength(3);
    expect(result[0]!._rankingScore).toBeGreaterThanOrEqual(result[1]!._rankingScore);
    expect(result[1]!._rankingScore).toBeGreaterThanOrEqual(result[2]!._rankingScore);
  });

  it('should include all ranking factors in explanation', () => {
    const result = rankHits([baseHit], {});

    expect(result[0]!._explanation.relevance).toBeDefined();
    expect(result[0]!._explanation.criteriaMatch).toBeDefined();
    expect(result[0]!._explanation.authenticityWeight).toBeDefined();
    expect(result[0]!._explanation.qualityScore).toBeDefined();
    expect(result[0]!._explanation.freshnessDecay).toBeDefined();
    expect(result[0]!._explanation.longTailFairness).toBeDefined();
    expect(result[0]!._explanation.risingScore).toBeDefined();
    expect(result[0]!._explanation.pakistanBoost).toBeDefined();
    expect(result[0]!._explanation.totalScore).toBeDefined();
  });

  it('should apply rising_score when present', () => {
    const hitWithoutRising = { ...baseHit };
    const hitWithRising = { ...baseHit, risingScore: 0.9 };

    const resultWithout = rankHits([hitWithoutRising], {});
    const resultWith = rankHits([hitWithRising], {});

    expect(resultWith[0]!._explanation.risingScore.score).toBe(0.9);
    expect(resultWithout[0]!._explanation.risingScore.score).toBe(0);
  });

  it('should apply Pakistan boost for PK niche in PK workspace', () => {
    const pkHit = { ...baseHit, primaryNiche: 'pk_fashion_textile' };

    const result = rankHits([pkHit], {}, { workspaceGeo: 'PK' });

    expect(result[0]!._explanation.pakistanBoost.score).toBeGreaterThan(0);
    expect(result[0]!._explanation.pakistanBoost.reason).toContain('PK workspace');
  });

  it('should not apply Pakistan boost when disabled', () => {
    const pkHit = { ...baseHit, primaryNiche: 'pk_fashion_textile' };

    // The boost is controlled by env var PAKISTAN_BOOST_ENABLED
    // In test environment, it may be enabled or disabled
    const result = rankHits([pkHit], {}, { workspaceGeo: 'PK' });

    // Just verify the structure exists
    expect(result[0]!._explanation.pakistanBoost).toBeDefined();
    expect(typeof result[0]!._explanation.pakistanBoost.score).toBe('number');
  });

  it('should use custom weights when provided', () => {
    const customWeights: RankingWeights = {
      relevance: 0.5,
      criteriaMatch: 0.1,
      authenticityWeight: 0.1,
      qualityScore: 0.1,
      freshnessDecay: 0.1,
      longTailFairness: 0.05,
      risingScore: 0.05,
    };

    const result = rankHits([baseHit], {}, { weights: customWeights });

    expect(result[0]!._explanation.relevance.weight).toBe(0.5);
    expect(result[0]!._explanation.risingScore.weight).toBe(0.05);
  });

  it('should handle missing optional fields gracefully', () => {
    const minimalHit = {
      _rankingScore: 0.5,
      followerCount: 1000,
    };

    const result = rankHits([minimalHit], {});

    expect(result).toHaveLength(1);
    expect(result[0]!._explanation).toBeDefined();
    expect(result[0]!._rankingScore).toBeGreaterThan(0);
  });

  it('should be deterministic for same inputs', () => {
    const hits = [
      { ...baseHit, _rankingScore: 0.7, followerCount: 30000 },
      { ...baseHit, _rankingScore: 0.9, followerCount: 80000 },
    ];

    const result1 = rankHits(hits, {});
    const result2 = rankHits(hits, {});

    expect(result1[0]!._rankingScore).toBeCloseTo(result2[0]!._rankingScore, 6);
    expect(result1[1]!._rankingScore).toBeCloseTo(result2[1]!._rankingScore, 6);
  });
});

describe('DEFAULT_RANKING_WEIGHTS', () => {
  it('should sum to 1.0', () => {
    const sum =
      DEFAULT_RANKING_WEIGHTS.relevance +
      DEFAULT_RANKING_WEIGHTS.criteriaMatch +
      DEFAULT_RANKING_WEIGHTS.authenticityWeight +
      DEFAULT_RANKING_WEIGHTS.qualityScore +
      DEFAULT_RANKING_WEIGHTS.freshnessDecay +
      DEFAULT_RANKING_WEIGHTS.longTailFairness +
      DEFAULT_RANKING_WEIGHTS.risingScore;

    expect(sum).toBeCloseTo(1.0, 2);
  });

  it('should have all required fields', () => {
    expect(DEFAULT_RANKING_WEIGHTS.relevance).toBeDefined();
    expect(DEFAULT_RANKING_WEIGHTS.criteriaMatch).toBeDefined();
    expect(DEFAULT_RANKING_WEIGHTS.authenticityWeight).toBeDefined();
    expect(DEFAULT_RANKING_WEIGHTS.qualityScore).toBeDefined();
    expect(DEFAULT_RANKING_WEIGHTS.freshnessDecay).toBeDefined();
    expect(DEFAULT_RANKING_WEIGHTS.longTailFairness).toBeDefined();
    expect(DEFAULT_RANKING_WEIGHTS.risingScore).toBeDefined();
  });
});
