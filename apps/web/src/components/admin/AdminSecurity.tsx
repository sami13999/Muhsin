'use client';

import React from 'react';

export default function AdminSecurity() {
  const incidents = [
    { id: 'sec-001', ip: '39.52.12.84', severity: 'Info', color: '#94a3b8', desc: 'MFA session login successful', time: '10m ago' },
    { id: 'sec-002', ip: '182.180.4.15', severity: 'Warning', color: '#f59e0b', desc: 'Failed login password attempt count: 3', time: '2h ago' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Security Incidents Log</h2>
      
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden', marginTop: '16px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left', color: '#cbd5e1' }}>
          <thead>
            <tr style={{ background: '#334155', borderBottom: '1px solid #475569', color: '#f1f5f9' }}>
              <th style={{ padding: '16px' }}>Incident ID</th>
              <th style={{ padding: '16px' }}>IP Location</th>
              <th style={{ padding: '16px' }}>Severity</th>
              <th style={{ padding: '16px' }}>Event description</th>
              <th style={{ padding: '16px' }}>Time</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((sec) => (
              <tr key={sec.id} style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '16px' }}>{sec.id}</td>
                <td style={{ padding: '16px' }}>{sec.ip}</td>
                <td style={{ padding: '16px' }}>
                  <span style={{ background: '#0f172a', border: `1px solid ${sec.color}`, color: sec.color, padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                    {sec.severity}
                  </span>
                </td>
                <td style={{ padding: '16px' }}>{sec.desc}</td>
                <td style={{ padding: '16px' }}>{sec.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
