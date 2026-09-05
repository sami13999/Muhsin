'use client';

import React from 'react';
import Link from 'next/link';

export default function WorkflowDiscoverTab() {
  const tags = ['Instagram', 'Bridal', '100K–1M', 'ER 5%+', 'Karachi + Lahore'];
  
  const creators = [
    { name: 'Ayesha Malik', handle: '@ayeshamalik. Fashion. Lahore', followers: '684K', er: '6.1% ER', iq: 'IQ 91' },
    { name: 'Fahad Qureshi', handle: '@fahad.q. Tech. Islamabad', followers: '1.2M', er: '4.4% ER', iq: 'IQ 92' },
    { name: 'Sana Riaz', handle: '@sanaa.k. Bridal. Karachi', followers: '412K', er: '5.2% ER', iq: 'IQ 89' },
    { name: 'Usman Tariq', handle: '@usmantariq. Comedy. Karachi', followers: '2.4M', er: '8.9% ER', iq: 'IQ 84' },
  ];

  return (
    <div className="workflow-tab-grid">
      {/* Left text info */}
      <div style={{ width: '100%' }}>
        <h3 style={{ fontSize: 'clamp(1.35rem, 3.5vw, 1.75rem)', fontWeight: 800, color: '#0f172a', lineHeight: 1.25, marginBottom: '16px', margin: 0 }}>
          Search Pakistan&apos;s entire creator graph across Instagram, TikTok & YouTube.
        </h3>
        <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6, margin: '16px 0 24px' }}>
          Filter by city, niche, follower band, engagement, and authenticity. Run semantic and lookalike search to surface Karachi, Lahore & Islamabad creators no spreadsheet ever could.
        </p>
        <Link href="/signup" style={{ color: '#4f46e5', fontWeight: 600, fontSize: '14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          Explore Discover <span style={{ fontSize: '16px' }}>→</span>
        </Link>
      </div>

      {/* Right Mockup Container */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)', width: '100%' }}>
        
        {/* Mockup header */}
        <div style={{ display: 'flex', gap: '6px', background: '#f8fafc', padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
        </div>

        {/* Mockup inner body */}
        <div className="workflow-mockup-body" style={{ minHeight: '300px', fontSize: '11px', color: '#0f172a' }}>
          
          {/* Sidebar filters */}
          <div style={{ borderRight: '1px solid #e2e8f0', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', background: '#f8fafc' }}>
            <span style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8' }}>FILTERS</span>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {tags.map((t, i) => (
                <span key={i} style={{ background: '#eef2ff', color: '#4f46e5', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 600 }}>
                  {t}
                </span>
              ))}
            </div>
            <div>
              <div style={{ color: '#64748b', marginBottom: '2px' }}>Audience age</div>
              <strong>18-34</strong>
            </div>
            <div>
              <div style={{ color: '#64748b', marginBottom: '2px' }}>Lookalike of</div>
              <strong>@sanaa.k</strong>
            </div>
          </div>

          {/* Creators List table */}
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '9px', fontWeight: 700, borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
              <span>3,214 creators match</span>
              <span>Sorted by IQ</span>
            </div>
            {creators.map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', border: '1px solid #f1f5f9', borderRadius: '8px', background: '#ffffff', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#f1f5f9', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '10px' }}>
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <strong style={{ display: 'block', fontSize: '11px' }}>{c.name}</strong>
                    <span style={{ fontSize: '9px', color: '#94a3b8' }}>{c.handle}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div>
                    <strong style={{ display: 'block' }}>{c.followers}</strong>
                    <span style={{ fontSize: '9px', color: '#10b981' }}>{c.er}</span>
                  </div>
                  <span style={{ background: '#e6fffa', color: '#0d9488', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, fontSize: '9px' }}>
                    {c.iq}
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

    </div>
  );
}
