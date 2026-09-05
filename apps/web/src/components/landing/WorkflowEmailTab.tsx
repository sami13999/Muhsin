'use client';

import React from 'react';
import Link from 'next/link';

export default function WorkflowEmailTab() {
  const threads = [
    { name: 'Ayesha Malik', subject: 'Re: Eid Sale 2026 collaboration', msg: 'Happy to chat — Tuesday works for a qui...', time: '2m' },
    { name: 'Fahad Qureshi', subject: 'Welcome to the BrandX program', msg: 'Thanks for the intro deck — reviewing now.', time: '1h' },
    { name: 'Sana Riaz', subject: 'Brief: bridal capsule launch', msg: 'Sharing thumbnails by end of day.', time: '3h' }
  ];

  return (
    <div className="workflow-tab-grid">
      
      {/* Left Text */}
      <div style={{ width: '100%' }}>
        <h3 style={{ fontSize: 'clamp(1.35rem, 3.5vw, 1.75rem)', fontWeight: 800, color: '#0f172a', lineHeight: 1.25, marginBottom: '16px', margin: 0 }}>
          Personalized outreach at agency scale, drafted by AI.
        </h3>
        <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6, margin: '16px 0 24px' }}>
          Generate, personalize, send, and track creator outreach from inside the same workspace where you discover and qualify them.
        </p>
        <Link href="/signup" style={{ color: '#4f46e5', fontWeight: 600, fontSize: '14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          Explore Email <span style={{ fontSize: '16px' }}>→</span>
        </Link>
      </div>

      {/* Right Mockup */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)', width: '100%' }}>
        <div style={{ display: 'flex', gap: '6px', background: '#f8fafc', padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
        </div>

        {/* Email Client grid */}
        <div className="workflow-mockup-body" style={{ minHeight: '300px', fontSize: '10px' }}>
          
          {/* Threads Column */}
          <div style={{ borderRight: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <div style={{ padding: '10px', fontWeight: 700, color: '#94a3b8', fontSize: '8px', borderBottom: '1px solid #f1f5f9' }}>INBOX</div>
            {threads.map((t, idx) => (
              <div key={idx} style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', background: idx === 0 ? '#eef2ff' : 'transparent', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#0f172a' }}>
                  <span>{t.name}</span>
                  <span style={{ fontSize: '8px', color: '#94a3b8' }}>{t.time}</span>
                </div>
                <div style={{ fontWeight: 500, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>{t.subject}</div>
              </div>
            ))}
          </div>

          {/* Composer Column */}
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <span style={{ color: '#94a3b8', marginRight: '6px' }}>To:</span>
              <strong>ayesha@brandx.pk</strong>
            </div>
            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
              <span style={{ color: '#94a3b8', marginRight: '6px' }}>Subject:</span>
              <strong>Eid Sale 2026 collaboration</strong>
            </div>

            {/* AI message block */}
            <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #eef2ff', borderRadius: '8px', padding: '10px', fontSize: '10px', color: '#475569', lineHeight: 1.4 }}>
              <div style={{ color: '#4f46e5', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px', fontSize: '9px' }}>
                <span>✨</span> AI-personalized draft
              </div>
              Hi Ayesha — loved your Ramadan series. Would love to talk about partnering on BrandX&apos;s Eid Sale 2026 push.
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <a href="#" style={{ color: '#4f46e5', fontWeight: 500, textDecoration: 'none' }}>📎 Attach brief</a>
              <button style={{ background: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '6px 14px', fontWeight: 600, cursor: 'pointer' }}>Send</button>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
