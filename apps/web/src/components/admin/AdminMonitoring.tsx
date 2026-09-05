'use client';

import React from 'react';

export default function AdminMonitoring() {
  const endpoints = [
    { path: '/api/v1/creators/search', meth: 'GET', p95: '210ms', up: '99.99%' },
    { path: '/api/v1/analytics', meth: 'GET', p95: '150ms', up: '100.00%' },
    { path: '/auth/login', meth: 'POST', p95: '85ms', up: '100.00%' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Endpoint P95 Latency Matrix</h2>
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden', marginTop: '16px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left', color: '#cbd5e1' }}>
          <thead>
            <tr style={{ background: '#334155', borderBottom: '1px solid #475569', color: '#f1f5f9' }}>
              <th style={{ padding: '16px' }}>API Endpoint</th>
              <th style={{ padding: '16px' }}>HTTP Method</th>
              <th style={{ padding: '16px' }}>p95 latency</th>
              <th style={{ padding: '16px' }}>Uptime</th>
            </tr>
          </thead>
          <tbody>
            {endpoints.map((ep, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '16px' }}>{ep.path}</td>
                <td style={{ padding: '16px', fontWeight: 700 }}>{ep.meth}</td>
                <td style={{ padding: '16px', color: '#10b981' }}>{ep.p95}</td>
                <td style={{ padding: '16px' }}>{ep.up}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
