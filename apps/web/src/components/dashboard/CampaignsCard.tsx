'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function CampaignsCard() {
  const router = useRouter();

  const campaigns = [
    { name: 'Eid Sale 2026', creators: 24, progress: 65, status: 'Live', statusColor: '#10b981' },
    { name: 'Ramadan Beauty Drop', creators: 18, progress: 48, status: 'Live', statusColor: '#10b981' },
    { name: 'Festive Bridal \'26', creators: 12, progress: 25, status: 'In review', statusColor: '#f97316' }
  ];

  return (
    <div style={{ 
      padding: '24px', 
      background: '#ffffff', 
      border: '1px solid #e2e8f0', 
      borderRadius: '12px', 
      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Campaigns</h3>
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>Active pipelines</p>
        </div>
        <span 
          onClick={() => router.push('/dashboard/campaigns')}
          style={{ fontSize: '12px', color: '#4f46e5', fontWeight: 600, cursor: 'pointer' }}
        >
          All ↗
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
        {campaigns.map((camp, idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{camp.name}</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{camp.creators} creators</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: camp.statusColor }} />
                <span>{camp.status}</span>
              </div>
            </div>
            {/* Progress Bar */}
            <div style={{ background: '#f1f5f9', height: '6px', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{ width: `${camp.progress}%`, background: '#6366f1', height: '100%', borderRadius: '9999px' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
