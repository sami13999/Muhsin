/**
 * Identity resolution unit tests.
 * Tests ADR-029 weighted-evidence scoring model.
 */
import { describe, it, expect } from 'vitest';
import {
  calculateIdentityScore,
  applyManualConfirmation,
  detectMinorSignal,
  type CreatorIdentityData,
  type EvidenceSignal,
} from '../identity/resolution.js';

describe('Identity Resolution (ADR-029)', () => {
  describe('calculateIdentityScore', () => {
    it('should return independent for no matching signals', () => {
      const source: CreatorIdentityData = {
        creatorId: 'creator-1',
        displayName: 'Alice',
        primaryHandle: '@alice',
      };
      const candidate: CreatorIdentityData = {
        creatorId: 'creator-2',
        displayName: 'Bob',
        primaryHandle: '@bob',
      };

      const score = calculateIdentityScore(source, candidate);

      expect(score.mergeStatus).toBe('independent');
      expect(score.confidence).toBe(0);
      expect(score.humanReviewRequired).toBe(false);
      expect(score.evidenceBreakdown).toHaveLength(0);
    });

    it('should auto-merge on shared verified email (45pts)', () => {
      const source: CreatorIdentityData = {
        creatorId: 'creator-1',
        emails: ['alice@example.com'],
      };
      const candidate: CreatorIdentityData = {
        creatorId: 'creator-2',
        emails: ['alice@example.com'],
      };

      const score = calculateIdentityScore(source, candidate);

      expect(score.confidence).toBe(45);
      expect(score.mergeStatus).toBe('independent'); // 45 < 60
      expect(score.evidenceBreakdown).toHaveLength(1);
      expect(score.evidenceBreakdown[0]!.type).toBe('shared_verified_contact');
    });

    it('should auto-merge on shared email + website ownership (45+35=80pts)', () => {
      const source: CreatorIdentityData = {
        creatorId: 'creator-1',
        emails: ['alice@example.com'],
        websites: ['https://alice.example.com'],
      };
      const candidate: CreatorIdentityData = {
        creatorId: 'creator-2',
        emails: ['alice@example.com'],
        websites: ['https://alice.example.com'],
      };

      const score = calculateIdentityScore(source, candidate);

      expect(score.confidence).toBe(80);
      expect(score.mergeStatus).toBe('candidate'); // 80 >= 60
      expect(score.humanReviewRequired).toBe(true);
    });

    it('should auto-merge on shared email + website + cross-mention (45+35+35=115, capped at 100)', () => {
      const source: CreatorIdentityData = {
        creatorId: 'creator-1',
        emails: ['alice@example.com'],
        websites: ['https://alice.example.com'],
        bioLinks: ['https://instagram.com/alice_real'],
      };
      const candidate: CreatorIdentityData = {
        creatorId: 'creator-2',
        emails: ['alice@example.com'],
        websites: ['https://alice.example.com'],
        primaryHandle: 'alice_real',
      };

      const score = calculateIdentityScore(source, candidate);

      expect(score.confidence).toBe(100); // capped at 100
      expect(score.mergeStatus).toBe('active');
      expect(score.humanReviewRequired).toBe(false);
    });

    it('should not auto-merge on face similarity alone (20pts)', () => {
      const source: CreatorIdentityData = {
        creatorId: 'creator-1',
        platformData: { face_similarity_score: 0.95 },
      };
      const candidate: CreatorIdentityData = {
        creatorId: 'creator-2',
        platformData: { face_similarity_score: 0.95 },
      };

      const score = calculateIdentityScore(source, candidate);

      expect(score.confidence).toBe(20);
      expect(score.mergeStatus).toBe('independent');
      // Face similarity is supporting only, never decisive alone
    });

    it('should not auto-merge on display name match alone (10pts)', () => {
      const source: CreatorIdentityData = {
        creatorId: 'creator-1',
        displayName: 'Ali',
      };
      const candidate: CreatorIdentityData = {
        creatorId: 'creator-2',
        displayName: 'Ali',
      };

      const score = calculateIdentityScore(source, candidate);

      expect(score.confidence).toBe(10);
      expect(score.mergeStatus).toBe('independent');
    });

    it('should handle manual reviewer confirmation (overrides to 100)', () => {
      const source: CreatorIdentityData = {
        creatorId: 'creator-1',
        displayName: 'Alice',
      };
      const candidate: CreatorIdentityData = {
        creatorId: 'creator-2',
        displayName: 'Bob',
      };

      const initialScore = calculateIdentityScore(source, candidate);
      const confirmedScore = applyManualConfirmation(initialScore, 'reviewer-123', 'Verified via ID');

      expect(confirmedScore.confidence).toBe(100);
      expect(confirmedScore.mergeStatus).toBe('active');
      expect(confirmedScore.humanReviewRequired).toBe(false);
      expect(confirmedScore.evidenceBreakdown).toHaveLength(1);
      expect(confirmedScore.evidenceBreakdown[0]!.type).toBe('manual_reviewer_confirmation');
    });
  });

  describe('detectMinorSignal', () => {
    it('should detect minor from self-reported age', () => {
      const creator: CreatorIdentityData = {
        creatorId: 'creator-1',
        platformData: { self_reported_age: 16 },
      };

      expect(detectMinorSignal(creator)).toBe(true);
    });

    it('should not flag adult from self-reported age', () => {
      const creator: CreatorIdentityData = {
        creatorId: 'creator-1',
        platformData: { self_reported_age: 25 },
      };

      expect(detectMinorSignal(creator)).toBe(false);
    });

    it('should detect minor from bio keywords', () => {
      const creator: CreatorIdentityData = {
        creatorId: 'creator-1',
        platformData: { bio: 'Just a teen sharing my art' },
      };

      expect(detectMinorSignal(creator)).toBe(true);
    });

    it('should detect minor from age pattern in bio', () => {
      const creator: CreatorIdentityData = {
        creatorId: 'creator-1',
        platformData: { bio: "I'm 15 years old" },
      };

      expect(detectMinorSignal(creator)).toBe(true);
    });

    it('should detect minor from platform designation', () => {
      const creator: CreatorIdentityData = {
        creatorId: 'creator-1',
        platformData: { account_type: 'minor' },
      };

      expect(detectMinorSignal(creator)).toBe(true);
    });

    it('should not flag normal adult bio', () => {
      const creator: CreatorIdentityData = {
        creatorId: 'creator-1',
        platformData: { bio: 'Digital creator | Travel | Food' },
      };

      expect(detectMinorSignal(creator)).toBe(false);
    });

    it('should return false when no platform data', () => {
      const creator: CreatorIdentityData = {
        creatorId: 'creator-1',
      };

      expect(detectMinorSignal(creator)).toBe(false);
    });
  });

  describe('Signal weights (ADR-029)', () => {
    it('should weight shared contact at 45pts', () => {
      const source: CreatorIdentityData = {
        creatorId: '1',
        emails: ['test@example.com'],
      };
      const candidate: CreatorIdentityData = {
        creatorId: '2',
        emails: ['test@example.com'],
      };

      const score = calculateIdentityScore(source, candidate);
      expect(score.evidenceBreakdown[0]!.weight).toBe(45);
    });

    it('should weight website ownership at 35pts', () => {
      const source: CreatorIdentityData = {
        creatorId: '1',
        websites: ['https://example.com'],
      };
      const candidate: CreatorIdentityData = {
        creatorId: '2',
        websites: ['https://example.com'],
      };

      const score = calculateIdentityScore(source, candidate);
      expect(score.evidenceBreakdown[0]!.weight).toBe(35);
    });

    it('should weight username match at 15pts', () => {
      const source: CreatorIdentityData = {
        creatorId: '1',
        primaryHandle: '@alice',
      };
      const candidate: CreatorIdentityData = {
        creatorId: '2',
        primaryHandle: '@alice',
      };

      const score = calculateIdentityScore(source, candidate);
      expect(score.evidenceBreakdown[0]!.weight).toBe(15);
    });
  });
});
