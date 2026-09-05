'use client';

import React from 'react';
import { useToast } from '@/lib/toast';

export default function AdminSupport() {
  const toast = useToast();
  const tickets = [
    { id: 'tkt-12', sub: 'WABA billing integration failed', sender: 'faisal@brandx.pk', pri: 'Critical', color: '#ef4444' },
    { id: 'tkt-15', sub: 'Low credit notification threshold adjustment', sender: 'mira@brandx.pk', pri: 'Normal', color: '#cbd5e1' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Support Tickets</h2>
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden', marginTop: '16px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left', color: '#cbd5e1' }}>
          <thead>
            <tr style={{ background: '#334155', borderBottom: '1px solid #475569', color: '#f1f5f9' }}>
              <th style={{ padding: '16px' }}>Ticket ID</th>
              <th style={{ padding: '16px' }}>Subject</th>
              <th style={{ padding: '16px' }}>Sender</th>
              <th style={{ padding: '16px' }}>Priority</th>
              <th style={{ padding: '16px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id} style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '16px' }}>{t.id}</td>
                <td style={{ padding: '16px', fontWeight: 600, color: '#f1f5f9' }}>{t.sub}</td>
                <td style={{ padding: '16px' }}>{t.sender}</td>
                <td style={{ padding: '16px' }}>
                  <span style={{ background: t.color, color: '#0f172a', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                    {t.pri}
                  </span>
                </td>
                <td style={{ padding: '16px' }}>
                  <button onClick={() => toast.success('Ticket Claimed', 'Assigned to your queue.')} style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer', fontWeight: 600 }}>
                    Claim
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
