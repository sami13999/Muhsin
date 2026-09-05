'use client';

interface IntelligenceScoreGaugeProps {
  authenticityScore: number | null;
  qualityScore: number | null;
  confidenceLevel: string | null;
}

export default function IntelligenceScoreGauge({
  authenticityScore,
  qualityScore,
  confidenceLevel,
}: IntelligenceScoreGaugeProps) {
  // Calculate composite score from existing signals
  const scores = [authenticityScore, qualityScore].filter(s => s !== null && s !== undefined);
  const compositeScore = scores.length > 0
    ? scores.reduce((sum, s) => sum + (s as number), 0) / scores.length
    : null;

  function getScoreColor(score: number | null): string {
    if (score === null) return '#94a3b8';
    if (score >= 0.8) return '#22c55e';
    if (score >= 0.6) return '#f59e0b';
    return '#ef4444';
  }

  function getScoreLabel(score: number | null): string {
    if (score === null) return 'No Data';
    if (score >= 0.8) return 'Excellent';
    if (score >= 0.6) return 'Good';
    if (score >= 0.4) return 'Moderate';
    return 'Low';
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      padding: '24px',
    }}>
      <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Intelligence Score</h2>

      {/* Composite Score */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          border: `4px solid ${getScoreColor(compositeScore)}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
        }}>
          <span style={{ fontSize: '32px', fontWeight: 700, color: getScoreColor(compositeScore) }}>
            {compositeScore !== null ? (compositeScore * 100).toFixed(0) : '—'}
          </span>
          <span style={{ fontSize: '12px', color: '#64748b' }}>/100</span>
        </div>
        <p style={{ fontSize: '14px', color: '#64748b', marginTop: '8px' }}>
          {getScoreLabel(compositeScore)}
        </p>
      </div>

      {/* Individual Scores */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: '#64748b' }}>Authenticity</span>
          <span style={{ fontSize: '14px', fontWeight: 500, color: getScoreColor(authenticityScore) }}>
            {authenticityScore !== null ? (authenticityScore * 100).toFixed(0) + '%' : '—'}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: '#64748b' }}>Quality</span>
          <span style={{ fontSize: '14px', fontWeight: 500, color: getScoreColor(qualityScore) }}>
            {qualityScore !== null ? (qualityScore * 100).toFixed(0) + '%' : '—'}
          </span>
        </div>
      </div>

      {/* Confidence Level */}
      {confidenceLevel && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: '#64748b' }}>Confidence</span>
            <span style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              background: confidenceLevel === 'high' ? '#dcfce7' :
                          confidenceLevel === 'medium' ? '#fef3c7' :
                          '#fee2e2',
              color: confidenceLevel === 'high' ? '#166534' :
                     confidenceLevel === 'medium' ? '#92400e' :
                     '#991b1b',
            }}>
              {confidenceLevel}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
