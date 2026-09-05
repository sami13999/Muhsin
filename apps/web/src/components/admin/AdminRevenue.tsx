'use client';

import React from 'react';

export default function AdminRevenue() {
  const stats = [
    { label: 'MRR', val: 'PKR 1.48M' },
    { label: 'ARR', val: 'PKR 17.7M' },
    { label: 'Churn rate', val: '1.2%' },
    { label: 'LTV : CAC ratio', val: '4.8' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Revenue Analytics</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {stats.map((kpi, i) => (
          <div key={i} style={{ padding: '20px', background: '#1e293b', borderRadius: '8px', border: '1px solid #334155' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{kpi.label}</span>
            <strong style={{ display: 'block', fontSize: '18px', marginTop: '4px', color: '#ffffff' }}>{kpi.val}</strong>
          </div>
        ))}
      </div>
      <div style={{ padding: '24px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', height: '140px', display: 'flex', alignItems: 'flex-end', gap: '8px', marginTop: '16px' }}>
        {[30, 45, 60, 50, 80, 75, 95, 80, 110, 100, 130, 120].map((h, i) => (
          <div key={i} style={{ flex: 1, background: '#3b82f6', height: `${h}%`, borderRadius: '3px 3px 0 0', opacity: 0.85 }} />
        ))}
      </div>
    </div>
  );
}
