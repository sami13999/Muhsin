 'use client';

import { useState, useEffect } from 'react';

interface ImpersonationInfo {
  sessionId: string;
  workspaceId: string;
  mode: 'read-only' | 'full';
  startedAt: string;
  expiresAt: string;
}

interface ImpersonationBannerProps {
  impersonation: ImpersonationInfo;
  onEnd: () => void;
}

export default function ImpersonationBanner({ impersonation, onEnd }: ImpersonationBannerProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    function updateTimer() {
      const expiresAt = new Date(impersonation.expiresAt);
      const now = new Date();
      const remaining = expiresAt.getTime() - now.getTime();

      if (remaining <= 0) {
        onEnd();
        return;
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    }

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [impersonation.expiresAt, onEnd]);

  return (
    <div style={{
      background: impersonation.mode === 'full' ? '#fef3c7' : '#dbeafe',
      borderBottom: `2px solid ${impersonation.mode === 'full' ? '#f59e0b' : '#3b82f6'}`,
      padding: '12px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 600,
          background: impersonation.mode === 'full' ? '#f59e0b' : '#3b82f6',
          color: 'white',
        }}>
          {impersonation.mode === 'full' ? 'FULL' : 'READ-ONLY'} IMPERSONATION
        </span>
        <span style={{ fontSize: '14px', color: '#334155' }}>
          Workspace: <strong>{impersonation.workspaceId.slice(0, 8)}...</strong>
        </span>
        <span style={{ fontSize: '14px', color: '#64748b' }}>
          Time remaining: <strong>{timeRemaining}</strong>
        </span>
      </div>
      <button
        onClick={onEnd}
        style={{
          padding: '8px 16px',
          background: '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        End Impersonation
      </button>
    </div>
  );
}
