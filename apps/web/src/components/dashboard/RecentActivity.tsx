'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function RecentActivity() {
  const router = useRouter();

  const activities = [
    {
      text: '5 creators verified in \'Bridal Lahore Q3\'',
      user: 'Sana Riaz',
      time: '2m ago',
      icon: (
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: '#ecfdf5',
          color: '#10b981',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px'
        }}>
          ✓
        </div>
      )
    },
    {
      text: 'Campaign \'Eid Sale 2026\' moved 3 creators to outreach',
      user: 'Bilal Hussain',
      time: '14m ago',
      icon: (
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: '#f5f3ff',
          color: '#6366f1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          i
        </div>
      )
    },
    {
      text: 'Bot score >40 flagged on @glamlhr.studio',
      user: 'System',
      time: '47m ago',
      icon: (
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: '#fff7ed',
          color: '#f97316',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          !
        </div>
      )
    },
    {
      text: 'Lookalike returned 28 matches for @sanaa.k',
      user: 'Fahad Qureshi',
      time: '1h ago',
      icon: (
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: '#f5f3ff',
          color: '#6366f1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          i
        </div>
      )
    }
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
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Workspace activity</h3>
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>Latest events across your team</p>
        </div>
        <span 
          onClick={() => router.push('/dashboard/analytics?tab=activity')}
          style={{ fontSize: '12px', color: '#4f46e5', fontWeight: 600, cursor: 'pointer' }}
        >
          Open activity log ↗
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
        {activities.map((act, idx) => (
          <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            {act.icon}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b' }}>
                {act.text}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                {act.user} . {act.time}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
