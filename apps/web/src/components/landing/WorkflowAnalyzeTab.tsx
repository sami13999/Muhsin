'use client';

import React from 'react';
import Link from 'next/link';

export default function WorkflowAnalyzeTab() {
  const metrics = [
    { label: 'Audience trust', val: '92' },
    { label: 'Engagement', val: '5.6%' },
    { label: 'Consistency', val: '88' },
    { label: 'Fit score', val: '91' },
  ];

  return (
    <div className="workflow-tab-grid">
      
      {/* Left Text */}
      <div style={{ width: '100%' }}>
        <h3 style={{ fontSize: 'clamp(1.35rem, 3.5vw, 1.75rem)', fontWeight: 800, color: '#0f172a', lineHeight: 1.25, marginBottom: '16px', margin: 0 }}>
          Know exactly who you&apos;re paying — before you sign.
        </h3>
        <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6, margin: '16px 0 24px' }}>
          Detect bot followers, engagement pods, and suspicious spikes. The Mushin IQ score distills creator quality into one trustworthy number.
        </p>
        <Link href="/signup" style={{ color: '#4f46e5', fontWeight: 600, fontSize: '14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          Explore Analyze <span style={{ fontSize: '16px' }}>→</span>
        </Link>
      </div>

      {/* Right Mockup */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)', width: '100%' }}>
        <div style={{ display: 'flex', gap: '6px', background: '#f8fafc', padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
        </div>

        <div className="workflow-mockup-body" style={{ minHeight: '300px', padding: '16px', gap: '16px', fontSize: '11px', color: '#0f172a' }}>
          {/* IQ Dial Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid #f1f5f9', paddingRight: '12px' }}>
            <span style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>CREATOR IQ</span>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', border: '5px solid #eef2ff', borderTopColor: '#4f46e5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <strong style={{ fontSize: '16px', color: '#0f172a' }}>89</strong>
              <span style={{ fontSize: '7px', color: '#94a3b8' }}>IQ SCORE</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', width: '100%' }}>
              {metrics.map((m, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '8px', color: '#94a3b8', display: 'block' }}>{m.label}</span>
                  <strong style={{ fontSize: '11px', color: '#0f172a' }}>{m.val}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Graph Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#0f172a' }}>Engagement integrity</span>
              <span style={{ fontSize: '9px', background: '#d1fae5', color: '#065f46', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>Authentic</span>
            </div>
            <span style={{ fontSize: '9px', color: '#94a3b8' }}>Last 90 days. daily</span>
            <div style={{ height: '100px', display: 'flex', alignItems: 'flex-end', borderBottom: '1.5px solid #cbd5e1', borderLeft: '1.5px solid #cbd5e1', padding: '0 10px 4px' }}>
              <svg width="100%" height="80" viewBox="0 0 100 80" preserveAspectRatio="none">
                <path d="M 0 60 Q 20 40 40 45 T 80 20 T 100 15" fill="none" stroke="#10b981" strokeWidth="2.5" />
                <circle cx="100" cy="15" r="3.5" fill="#10b981" />
              </svg>
            </div>
            <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '8px 12px', borderRadius: '6px', fontSize: '9px', color: '#b45309', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⚠️</span>
              <span>One spike flagged for review - Mar 14.</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
