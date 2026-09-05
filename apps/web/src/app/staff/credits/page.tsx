'use client';

import { useState } from 'react';

export default function CreditsPage() {
  const [workspaceId, setWorkspaceId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [ticketRef, setTicketRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleAdjust() {
    if (!workspaceId.trim() || !amount.trim() || !reason.trim()) {
      setError('All fields are required');
      return;
    }

    if (reason.length < 10) {
      setError('Reason must be at least 10 characters');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/staff/credits/adjust`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('mushin_token') ?? ''}`,
            'X-Workspace-ID': localStorage.getItem('workspaceId') ?? '',
          },
          body: JSON.stringify({
            workspaceId,
            amount: parseInt(amount, 10),
            reason,
            ticketRef: ticketRef || undefined,
          }),
        }
      );

      if (response.ok) {
        setSuccess(true);
        setWorkspaceId('');
        setAmount('');
        setReason('');
        setTicketRef('');
      } else {
        const data = await response.json();
        setError(data.error?.message ?? 'Failed to adjust credits');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to adjust credits');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '24px' }}>Credit Adjustments</h1>

      <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '24px', maxWidth: '500px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Adjust Workspace Credits</h2>

        {error && (
          <p style={{ color: '#ef4444', marginBottom: '16px' }}>{error}</p>
        )}

        {success && (
          <p style={{ color: '#22c55e', marginBottom: '16px' }}>Credit adjustment submitted successfully</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
              Workspace ID
            </label>
            <input
              type="text"
              placeholder="UUID"
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'monospace',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
              Amount (positive = add, negative = subtract)
            </label>
            <input
              type="number"
              placeholder="e.g. 100 or -50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
              Reason (min 10 characters)
            </label>
            <textarea
              placeholder="Explain the reason for this adjustment..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '14px',
                resize: 'vertical',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
              Ticket Reference (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. SUP-123"
              value={ticketRef}
              onChange={(e) => setTicketRef(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>

          <button
            onClick={handleAdjust}
            disabled={loading}
            style={{
              padding: '12px 20px',
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
            {loading ? 'Processing...' : 'Submit Adjustment'}
          </button>
        </div>
      </div>
    </div>
  );
}
