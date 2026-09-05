'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function QuickActions() {
  const router = useRouter();

  const quickActions = [
    { title: 'Start a search', desc: 'Find creators across 3 networks', icon: '🔍', link: '/dashboard/search' },
    { title: 'New list', desc: 'Group & export campaign influencers', icon: '📋', link: '/dashboard/lists' },
    { title: 'New campaign', desc: 'Track creator negotiations', icon: '📣', link: '/dashboard/campaigns' },
    { title: 'Top up credits', desc: 'Purchase search packages in PKR', icon: '⚡', link: '/dashboard/billing?topup=true' },
  ];

  return (
    <div>
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '16px', margin: 0 }}>Quick Actions</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '16px' }}>
        {quickActions.map((action) => (
          <div
            key={action.title}
            onClick={() => router.push(action.link)}
            style={{
              padding: '20px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.01)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#4f46e5';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(79,70,229,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.01)';
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>{action.icon}</div>
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '4px', margin: 0 }}>{action.title}</h4>
            <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4, margin: '4px 0 0' }}>{action.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
