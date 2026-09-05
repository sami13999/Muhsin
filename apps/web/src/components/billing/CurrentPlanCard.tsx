'use client';

import React from 'react';

interface CurrentPlanCardProps {
  currentPlan: string;
  creditsUsed: number;
  creditsTotal: number;
  onUpgradeClick: () => void;
}

export default function CurrentPlanCard({
  currentPlan,
  creditsUsed,
  creditsTotal,
  onUpgradeClick
}: CurrentPlanCardProps) {
  const percent = Math.min(100, Math.round((creditsUsed / creditsTotal) * 100));

  return (
    <div style={{ 
      background: '#090f1e', 
      borderRadius: '16px', 
      padding: '24px', 
      color: '#ffffff', 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'space-between',
      height: '100%',
      minHeight: '260px',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div>
        <span style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>CURRENT PLAN</span>
        <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '8px 0 0', color: '#ffffff' }}>{currentPlan}</h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '24px 0' }}>
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Credits used this period</span>
        <div style={{ fontSize: '20px', fontWeight: 700 }}>
          {creditsUsed.toLocaleString()} <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>/ {creditsTotal.toLocaleString()}</span>
        </div>
        <div style={{ background: '#1e293b', height: '6px', borderRadius: '3px', overflow: 'hidden', marginTop: '6px' }}>
          <div style={{ width: `${percent}%`, background: '#2dd4bf', height: '100%', borderRadius: '3px' }} />
        </div>
      </div>

      <button 
        onClick={onUpgradeClick}
        style={{ 
          width: '100%', 
          background: '#ffffff', 
          color: '#0f172a', 
          border: 'none', 
          padding: '12px', 
          borderRadius: '8px', 
          fontSize: '13px', 
          fontWeight: 700, 
          cursor: 'pointer',
          fontFamily: "'Inter', sans-serif",
          transition: 'all 0.15s ease'
        }}
      >
        Upgrade plan
      </button>
    </div>
  );
}
