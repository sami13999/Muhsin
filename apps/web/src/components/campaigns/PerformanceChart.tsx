'use client';

import React from 'react';

export default function PerformanceChart() {
  const stats = [
    { label: 'IMPRESSIONS', val: '1.2M' },
    { label: 'ENGAGEMENTS', val: '85.4K' },
    { label: 'CLICKS', val: '12.5K' },
    { label: 'RESPONSE RATE', val: '74%' },
    { label: 'EST. ROI', val: '3.4x', isGreen: true },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', textAlign: 'center', marginBottom: '24px' }}>
        {stats.map((stat, idx) => (
          <div key={idx} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#ffffff' }}>
            <span style={{ fontSize: '11px', color: '#64748b' }}>{stat.label}</span>
            <strong style={{ display: 'block', fontSize: '16px', marginTop: '4px', color: stat.isGreen ? '#10b981' : '#0f172a' }}>{stat.val}</strong>
          </div>
        ))}
      </div>
      <div style={{ padding: '24px', border: '1px solid #e2e8f0', borderRadius: '12px', height: '160px', display: 'flex', alignItems: 'flex-end', gap: '8px', background: '#f8fafc' }}>
        {[25, 45, 60, 50, 80, 65, 95, 75, 110, 90, 130].map((h, i) => (
          <div key={i} style={{ flex: 1, background: '#4f46e5', height: `${h}%`, borderRadius: '3px 3px 0 0', opacity: 0.85 }} />
        ))}
      </div>
    </div>
  );
}
