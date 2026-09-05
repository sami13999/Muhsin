'use client';

import React from 'react';
import { useToast } from '@/lib/toast';

export default function AdminSettings() {
  const toast = useToast();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>System Settings & Flags</h2>
      
      <div style={{ padding: '24px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
          <div>
            <strong style={{ fontSize: '14px', display: 'block', color: '#f1f5f9' }}>Maintenance Mode</strong>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Gate general users with the Maintenance template preset.</span>
          </div>
          <input type="checkbox" style={{ width: '20px', height: '20px', cursor: 'pointer' }} onChange={() => toast.info('System flag toggled', 'Maintenance mode set.')} />
        </label>

        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
          <div>
            <strong style={{ fontSize: '14px', display: 'block', color: '#f1f5f9' }}>Real-time Modash Scrapers</strong>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Scrape new creator nodes on demand (consumes Modash API quota).</span>
          </div>
          <input type="checkbox" defaultChecked style={{ width: '20px', height: '20px', cursor: 'pointer' }} onChange={() => toast.info('System flag toggled', 'Real-time scrapers set.')} />
        </label>
      </div>
    </div>
  );
}
