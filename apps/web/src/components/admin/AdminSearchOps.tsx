'use client';

import React from 'react';

export default function AdminSearchOps() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Active Scraper Queues</h2>
      <div style={{ padding: '20px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', marginTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
          <span>Instagram Queue depth</span>
          <strong>14 jobs</strong>
        </div>
        <div style={{ background: '#334155', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: '40%', background: '#4f46e5', height: '100%' }} />
        </div>
      </div>
      <div style={{ padding: '20px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
          <span>YouTube Queue depth</span>
          <strong>3 jobs</strong>
        </div>
        <div style={{ background: '#334155', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: '10%', background: '#ff0000', height: '100%' }} />
        </div>
      </div>
    </div>
  );
}
