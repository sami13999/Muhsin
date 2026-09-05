'use client';

interface PerformanceStatsProps {
  followers: number | null;
  engagementRate: number | null;
  platformMetrics: Record<string, unknown> | null;
}

export default function PerformanceStats({ followers, engagementRate, platformMetrics }: PerformanceStatsProps) {
  function formatNumber(num: number | null): string {
    if (num === null) return '—';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return num.toString();
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      padding: '24px',
    }}>
      <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Performance Stats</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Followers */}
        <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '6px' }}>
          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Followers</p>
          <p style={{ fontSize: '24px', fontWeight: 600 }}>{formatNumber(followers)}</p>
        </div>

        {/* Engagement Rate */}
        <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '6px' }}>
          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Engagement Rate</p>
          <p style={{ fontSize: '24px', fontWeight: 600 }}>
            {engagementRate !== null ? (engagementRate * 100).toFixed(2) + '%' : '—'}
          </p>
        </div>

        {/* Platform-specific metrics */}
        {platformMetrics && Object.entries(platformMetrics).slice(0, 4).map(([key, value]) => (
          <div key={key} style={{ padding: '12px', background: '#f8fafc', borderRadius: '6px' }}>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </p>
            <p style={{ fontSize: '16px', fontWeight: 500 }}>
              {typeof value === 'number' ? formatNumber(value) : String(value ?? '—')}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
