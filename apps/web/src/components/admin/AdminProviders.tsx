'use client';

import React from 'react';

export default function AdminProviders() {
  const providers = [
    { name: 'Modash', status: 'Healthy', latency: '412ms', color: '#10b981' },
    { name: 'HypeAuditor', status: 'Healthy', latency: '820ms', color: '#10b981' },
    { name: 'SocialInsider', status: 'Degraded', latency: '2.1s', color: '#f59e0b' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>API Provider Health Checks</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '16px' }}>
        {providers.map((prov, i) => (
          <div key={i} style={{ padding: '20px', background: '#1e293b', borderRadius: '8px', border: '1px solid #334155' }}>
            <h4 style={{ fontWeight: 600, color: '#f1f5f9', margin: 0 }}>{prov.name}</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '12px' }}>
              <span style={{ color: prov.color }}>{prov.status}</span>
              <span>{prov.latency}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
