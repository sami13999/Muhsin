'use client';

interface FakeEngagementDetectionProps {
  evidenceBreakdown: Record<string, unknown> | null;
}

export default function FakeEngagementDetection({ evidenceBreakdown }: FakeEngagementDetectionProps) {
  if (!evidenceBreakdown) {
    return (
      <div style={{
        background: 'white',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        padding: '24px',
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Fake Engagement Detection</h2>
        <div style={{ textAlign: 'center', padding: '16px', color: '#64748b' }}>
          <p>No detection data available</p>
        </div>
      </div>
    );
  }

  // Extract fake engagement signals from evidence breakdown
  const signals = [
    {
      label: 'Suspicious Follower Growth',
      value: evidenceBreakdown['suspicious_follower_growth'] as boolean | undefined,
      description: 'Abnormal follower increase patterns detected',
    },
    {
      label: 'Engagement Anomalies',
      value: evidenceBreakdown['engagement_anomalies'] as boolean | undefined,
      description: 'Unusual engagement patterns that may indicate inauthentic activity',
    },
    {
      label: 'Audience Mismatch',
      value: evidenceBreakdown['audience_mismatch'] as boolean | undefined,
      description: 'Audience demographics don\'t align with content niche',
    },
    {
      label: 'Inorganic Interactions',
      value: evidenceBreakdown['inorganic_interactions'] as boolean | undefined,
      description: 'Bot-like or purchased engagement patterns',
    },
  ];

  const hasAnySignal = signals.some(s => s.value === true);

  return (
    <div style={{
      background: 'white',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      padding: '24px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Fake Engagement Detection</h2>
        {hasAnySignal && (
          <span style={{
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 500,
            background: '#fee2e2',
            color: '#991b1b',
          }}>
            Flags Detected
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {signals.map((signal) => (
          <div key={signal.label} style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '12px',
            background: signal.value === true ? '#fef2f2' : '#f8fafc',
            borderRadius: '6px',
            border: signal.value === true ? '1px solid #fecaca' : '1px solid transparent',
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              flexShrink: 0,
              marginTop: '2px',
              background: signal.value === true ? '#ef4444' : '#22c55e',
              color: 'white',
            }}>
              {signal.value === true ? '!' : '✓'}
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 500, marginBottom: '2px' }}>
                {signal.label}
              </p>
              <p style={{ fontSize: '12px', color: '#64748b' }}>
                {signal.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
