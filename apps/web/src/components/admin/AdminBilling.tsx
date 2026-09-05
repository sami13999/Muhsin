'use client';

import React from 'react';

export default function AdminBilling() {
  const events = [
    { id: 'evt-001', ws: 'BrandX Pakistan', type: 'Unmask contact reveal', delta: '-5 credits', color: '#ef4444', time: '10m ago' },
    { id: 'evt-002', ws: 'BrandX Pakistan', type: 'Search query', delta: '-1 credits', color: '#ef4444', time: '12m ago' },
    { id: 'evt-003', ws: 'BrandX Pakistan', type: 'Purchase package', delta: '+250 credits', color: '#10b981', time: '1d ago' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Credits Ledger</h2>
      
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left', color: '#cbd5e1' }}>
          <thead>
            <tr style={{ background: '#334155', borderBottom: '1px solid #475569', color: '#f1f5f9' }}>
              <th style={{ padding: '16px' }}>Event ID</th>
              <th style={{ padding: '16px' }}>Workspace</th>
              <th style={{ padding: '16px' }}>Transaction Type</th>
              <th style={{ padding: '16px' }}>Delta</th>
              <th style={{ padding: '16px' }}>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {events.map((evt) => (
              <tr key={evt.id} style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '16px' }}>{evt.id}</td>
                <td style={{ padding: '16px' }}>{evt.ws}</td>
                <td style={{ padding: '16px' }}>{evt.type}</td>
                <td style={{ padding: '16px', fontWeight: 700, color: evt.color }}>{evt.delta}</td>
                <td style={{ padding: '16px' }}>{evt.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
