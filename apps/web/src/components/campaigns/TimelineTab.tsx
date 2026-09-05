'use client';

import React from 'react';

export default function TimelineTab() {
  const milestones = [
    { date: 'Jul 04', title: '@ayeshamalik post goes live', actor: 'Ayesha Malik', bg: '#ecfdf5', text: '#10b981' },
    { date: 'Jul 06', title: '@sanaa.k content delivery', actor: 'Sana Riaz', bg: '#fff7ed', text: '#f97316' },
    { date: 'Jul 08', title: '@usmantariq video drop', actor: 'Usman Tariq', bg: '#fff7ed', text: '#f97316' },
    { date: 'Jul 12', title: '@fahad.q review upload', actor: 'Fahad Qureshi', bg: '#eef2ff', text: '#4f46e5' },
    { date: 'Jul 20', title: 'Campaign closes · report auto-generated', actor: 'System', bg: '#f1f5f9', text: '#475569' }
  ];

  return (
    <div style={{ padding: '24px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', fontFamily: "'Inter', sans-serif" }}>
      <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', marginBottom: '20px' }}>
        Milestones
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
        {/* Timeline line connector */}
        <div style={{ position: 'absolute', left: '80px', top: '10px', bottom: '10px', width: '2px', background: '#f1f5f9' }} />

        {milestones.map((m, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {/* Date Badge */}
            <span style={{ 
              width: '60px', 
              fontSize: '11px', 
              fontWeight: 700, 
              padding: '4px 8px', 
              borderRadius: '6px', 
              textAlign: 'center',
              background: m.bg, 
              color: m.text 
            }}>
              {m.date}
            </span>

            {/* Timeline node dot indicator */}
            <div style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: m.text, 
              border: '2px solid #ffffff', 
              zIndex: 10,
              marginLeft: '6px'
            }} />

            {/* Description */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                {m.title}
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                {m.actor}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
