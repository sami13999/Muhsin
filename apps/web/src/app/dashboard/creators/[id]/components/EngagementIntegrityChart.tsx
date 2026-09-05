'use client';

import { useEffect, useState } from 'react';

interface HistoryEntry {
  date: string | null;
  snapshotType: string;
  authenticityScore: number | null;
  qualityScore: number | null;
  confidenceLevel: string;
}

interface EngagementIntegrityChartProps {
  creatorId: string;
}

export default function EngagementIntegrityChart({ creatorId }: EngagementIntegrityChartProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/creators/${creatorId}/engagement-history?days=90`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('mushin_token') ?? ''}`,
              'X-Workspace-ID': localStorage.getItem('workspaceId') ?? '',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setHistory(data.data?.history ?? []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [creatorId]);

  if (loading) {
    return (
      <div style={{
        background: 'white',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        padding: '24px',
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Engagement History</h2>
        <p style={{ color: '#64748b' }}>Loading history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: 'white',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        padding: '24px',
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Engagement History</h2>
        <p style={{ color: '#ef4444' }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      padding: '24px',
    }}>
      <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Engagement History (90 days)</h2>

      {history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
          <p>No historical data available</p>
          <p style={{ fontSize: '12px', marginTop: '8px' }}>
            Data will appear here as enrichment snapshots are collected over time.
          </p>
        </div>
      ) : (
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Date</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Type</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Authenticity</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Quality</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {history.slice(0, 20).map((entry, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 12px', fontSize: '13px', color: '#64748b' }}>
                    {entry.date ?? '—'}
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: '13px' }}>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      background: '#f1f5f9',
                    }}>
                      {entry.snapshotType}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: '13px' }}>
                    {entry.authenticityScore !== null ? (entry.authenticityScore * 100).toFixed(0) + '%' : '—'}
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: '13px' }}>
                    {entry.qualityScore !== null ? (entry.qualityScore * 100).toFixed(0) + '%' : '—'}
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: '13px' }}>
                    {entry.confidenceLevel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
