'use client';

import React from 'react';

export default function AdminOverview() {
  const stats = [
    { title: 'Global MRR', val: 'PKR 1.48M' },
    { title: 'Active Workspaces', val: '248' },
    { title: 'Searches (24h)', val: '1,420' },
    { title: 'Credit events', val: '8,450' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>System Health Overview</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {stats.map((kpi, i) => (
          <div key={i} style={{ padding: '20px', background: '#1e293b', borderRadius: '8px', border: '1px solid #334155' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{kpi.title}</span>
            <strong style={{ display: 'block', fontSize: '20px', marginTop: '4px', color: '#ffffff' }}>{kpi.val}</strong>
          </div>
        ))}
      </div>

      <div style={{ padding: '24px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span>API Cluster Health Status: <strong style={{ color: '#10b981' }}>OPERATIONAL</strong></span>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Uptime: 99.98%</span>
        </div>
        <div style={{ display: 'flex', gap: '4px', height: '80px', alignItems: 'flex-end', marginTop: '16px' }}>
          {[100, 100, 98, 100, 100, 100, 99, 100, 100, 100, 100, 97, 100, 100].map((h, i) => (
            <div key={i} style={{ flex: 1, background: '#10b981', height: `${h}%`, opacity: 0.85, borderRadius: '2px' }} />
          ))}
        </div>
      </div>
    </div>
  );
}
