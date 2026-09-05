'use client';

import React from 'react';

export default function LandingPreviewMockup() {
  const sidebarItems = ['Overview', 'Workflows', 'Signals', 'Audiences', 'Reports', 'Integrations'];
  
  const stats = [
    { label: 'Active signals', val: '128,402', change: '+12.4%' },
    { label: 'Workflows', val: '1,284', change: '+3.1%' },
    { label: 'Verified profiles', val: '9.2M', change: '+24.7%' }
  ];

  return (
    <section style={{ padding: '0 24px 80px', background: '#ffffff' }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 30px 60px -15px rgba(15,23,42,0.06)',
        overflow: 'hidden',
      }}>
        {/* Window controls header bar */}
        <div style={{ background: '#f8fafc', height: '40px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
        </div>

        {/* Dashboard inner window container */}
        <div className="landing-preview-grid" style={{ minHeight: '380px', fontSize: '11px', color: '#0f172a' }}>
          
          {/* Left Sidebar */}
          <div className="landing-preview-sidebar" style={{ background: '#f8fafc', borderRight: '1px solid #e2e8f0', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {sidebarItems.map((item, idx) => {
              const isSelected = item === 'Overview';
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    background: isSelected ? '#ffffff' : 'transparent',
                    border: isSelected ? '1px solid #e2e8f0' : 'none',
                    borderRadius: isSelected ? '8px' : '0',
                    color: isSelected ? '#0f172a' : '#64748b',
                    fontWeight: isSelected ? 600 : 500,
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: isSelected ? '#4f46e5' : '#cbd5e1' }} />
                  {item}
                </div>
              );
            })}
          </div>

          {/* Right Main panel */}
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
            
            {/* Real breadcrumbs and actions instead of gray boxes */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#64748b' }}>
                <span>Campaigns</span>
                <span>/</span>
                <span style={{ color: '#0f172a' }}>Eid Push 2026</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: '4px', background: '#ffffff', color: '#475569', fontWeight: 600 }}>Active</span>
                <span style={{ background: '#0f172a', color: '#ffffff', padding: '4px 10px', borderRadius: '4px', fontWeight: 600 }}>+ Add creator</span>
              </div>
            </div>

            {/* Metrics cards */}
            <div className="landing-preview-stats-grid" style={{ gap: '16px' }}>
              {stats.map((card, idx) => (
                <div key={idx} style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#ffffff' }}>
                  <span style={{ color: '#64748b', fontSize: '10px' }}>{card.label}</span>
                  <strong style={{ display: 'block', fontSize: '18px', color: '#0f172a', marginTop: '6px' }}>{card.val}</strong>
                  <span style={{ color: '#10b981', fontWeight: 600, fontSize: '9px', display: 'block', marginTop: '4px' }}>{card.change}</span>
                </div>
              ))}
            </div>

            {/* Smooth Wave Chart panel */}
            <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', background: '#ffffff', display: 'flex', flexDirection: 'column', height: '180px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '10px' }}>
                <span>Real-time crawler load status</span>
                <strong>Updated just now</strong>
              </div>
              <div style={{ flex: 1, position: 'relative', marginTop: '12px' }}>
                <svg width="100%" height="100%" viewBox="0 0 400 120" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="wave-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(79, 70, 229, 0.15)" />
                      <stop offset="100%" stopColor="rgba(79, 70, 229, 0.0)" />
                    </linearGradient>
                  </defs>
                  <path d="M 0 100 Q 60 70 120 80 T 240 60 T 360 40 L 400 30 L 400 120 L 0 120 Z" fill="url(#wave-grad)" />
                  <path d="M 0 100 Q 60 70 120 80 T 240 60 T 360 40 L 400 30" fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
