'use client';

import { useEffect, useState } from 'react';
import CreatorHeader from './components/CreatorHeader';
import IntelligenceScoreGauge from './components/IntelligenceScoreGauge';
import PerformanceStats from './components/PerformanceStats';
import EngagementIntegrityChart from './components/EngagementIntegrityChart';
import AudienceDemographics from './components/AudienceDemographics';
import FakeEngagementDetection from './components/FakeEngagementDetection';
import ContactRevealCard from './components/ContactRevealCard';

interface CreatorData {
  creator: {
    creatorId: string;
    displayName: string;
    primaryHandle: string;
    minorSignal: boolean;
    createdAt: string;
  };
  profiles: Array<{
    profileId: string;
    platform: string;
    handle: string;
    followerCount: string | null;
    engagementRate: string | null;
    platformMetrics: Record<string, unknown> | null;
  }>;
  enrichment: Array<{
    snapshotId: string;
    snapshotType: string;
    verdict: Record<string, unknown>;
    evidenceBreakdown: Record<string, unknown>;
    confidenceLevel: string;
  }>;
  niches: Array<{
    primaryNiche: string;
    secondaryNiches: string[];
  }>;
}

export default function CreatorDetailClient({ creatorId }: { creatorId: string }) {
  const [creator, setCreator] = useState<CreatorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCreator() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/creators/${creatorId}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('mushin_token') ?? ''}`,
              'X-Workspace-ID': localStorage.getItem('workspaceId') ?? '',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setCreator(data.data);
        } else {
          setError('Failed to load creator');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load creator');
      } finally {
        setLoading(false);
      }
    }

    if (creatorId) {
      loadCreator();
    }
  }, [creatorId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <p>Loading creator details...</p>
      </div>
    );
  }

  if (error || !creator) {
    return (
      <div style={{ padding: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px' }}>Creator Not Found</h1>
        <p style={{ color: '#ef4444' }}>{error ?? 'Creator not found'}</p>
        <a href="/dashboard/search" style={{ color: '#3b82f6', marginTop: '16px', display: 'inline-block' }}>
          ← Back to Search
        </a>
      </div>
    );
  }

  const authenticitySnapshot = creator.enrichment.find(e => e.snapshotType === 'authenticity');
  const qualitySnapshot = creator.enrichment.find(e => e.snapshotType === 'quality');
  const audienceSnapshot = creator.enrichment.find(e => e.snapshotType === 'audience_estimate');

  const primaryProfile = creator.profiles.sort((a, b) =>
    (Number(b.followerCount) || 0) - (Number(a.followerCount) || 0)
  )[0];

  const primaryNiche = creator.niches[0]?.primaryNiche ?? null;
  const secondaryNiches = creator.niches[0]?.secondaryNiches ?? [];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      <a href="/dashboard/search" style={{ color: '#3b82f6', fontSize: '14px', marginBottom: '16px', display: 'inline-block' }}>
        ← Back to Search
      </a>

      <CreatorHeader
        name={creator.creator.displayName}
        handle={creator.creator.primaryHandle}
        platform={primaryProfile?.platform ?? 'unknown'}
        location={null}
        niches={[primaryNiche, ...secondaryNiches].filter(Boolean) as string[]}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginTop: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <IntelligenceScoreGauge
            authenticityScore={authenticitySnapshot?.verdict?.['score'] as number ?? null}
            qualityScore={qualitySnapshot?.verdict?.['score'] as number ?? null}
            confidenceLevel={authenticitySnapshot?.confidenceLevel ?? qualitySnapshot?.confidenceLevel ?? null}
          />

          <PerformanceStats
            followers={primaryProfile?.followerCount ? Number(primaryProfile.followerCount) : null}
            engagementRate={primaryProfile?.engagementRate ? Number(primaryProfile.engagementRate) : null}
            platformMetrics={primaryProfile?.platformMetrics ?? null}
          />

          <FakeEngagementDetection
            evidenceBreakdown={authenticitySnapshot?.evidenceBreakdown ?? null}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <ContactRevealCard
            creatorId={creator.creator.creatorId}
            minorSignal={creator.creator.minorSignal}
          />

          <AudienceDemographics
            audienceData={audienceSnapshot?.verdict ?? null}
          />

          <EngagementIntegrityChart creatorId={creator.creator.creatorId} />
        </div>
      </div>
    </div>
  );
}
