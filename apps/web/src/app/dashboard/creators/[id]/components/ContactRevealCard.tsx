'use client';

import { useState } from 'react';

interface ContactRevealCardProps {
  creatorId: string;
  minorSignal: boolean;
}

export default function ContactRevealCard({ creatorId, minorSignal }: ContactRevealCardProps) {
  const [revealed, setRevealed] = useState(false);
  const [contact, setContact] = useState<Record<string, string | null> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReveal() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/creators/${creatorId}/reveal-contact`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('mushin_token') ?? ''}`,
            'X-Workspace-ID': localStorage.getItem('workspaceId') ?? '',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setRevealed(true);
        setContact(data.data?.contact ?? null);
      } else {
        const data = await response.json();
        setError(data.error?.message ?? 'Failed to reveal contact');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reveal contact');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      padding: '24px',
    }}>
      <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Contact Information</h2>

      {/* Minor Signal Warning */}
      {minorSignal && (
        <div style={{
          padding: '12px',
          background: '#fef3c7',
          borderRadius: '6px',
          marginBottom: '16px',
          border: '1px solid #fcd34d',
        }}>
          <p style={{ fontSize: '14px', color: '#92400e', fontWeight: 500 }}>
            Contact reveal is blocked
          </p>
          <p style={{ fontSize: '12px', color: '#a16207', marginTop: '4px' }}>
            This creator has been flagged with minor_signal. Contact reveal is blocked per ADR-029 safety rules.
          </p>
        </div>
      )}

      {/* Revealed Contact */}
      {revealed && contact && (
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '12px', color: '#22c55e', fontWeight: 500, marginBottom: '8px' }}>
            Contact revealed successfully
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.entries(contact).map(([type, value]) => (
              <div key={type} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: '#f8fafc',
                borderRadius: '6px',
              }}>
                <span style={{ fontSize: '14px', color: '#64748b' }}>
                  {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>
                  {value ?? '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p style={{ color: '#ef4444', fontSize: '14px', marginBottom: '16px' }}>{error}</p>
      )}

      {/* Reveal Button */}
      {!revealed && !minorSignal && (
        <div>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '12px' }}>
            Reveal contact information for this creator.
          </p>
          <div style={{
            padding: '12px',
            background: '#f1f5f9',
            borderRadius: '6px',
            marginBottom: '12px',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '14px', color: '#334155' }}>
              Uses <strong>5 credits</strong>
            </p>
          </div>
          <button
            onClick={handleReveal}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Revealing...' : 'Reveal Contact'}
          </button>
        </div>
      )}
    </div>
  );
}
