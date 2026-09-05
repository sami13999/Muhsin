'use client';

import React, { useState } from 'react';

export default function LandingFeaturesGrid() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const features = [
    {
      title: 'Creator discovery',
      desc: 'Search creators across Instagram, TikTok, and YouTube with niche, audience, and engagement filters — plus lookalike and semantic discovery.',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
      )
    },
    {
      title: 'AI bot detection',
      desc: "Surface fake followers, engagement pods, and growth anomalies. Know exactly who you're paying — before you sign.",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      )
    },
    {
      title: 'Creator IQ score',
      desc: 'A proprietary score for influence quality, audience trust, and campaign suitability. Vanity metrics replaced with signal.',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M12 12l4-4" /><circle cx="12" cy="12" r="1" />
        </svg>
      )
    },
    {
      title: 'AI enrichment & insights',
      desc: 'Audience demographics, growth history, niche analysis, and AI-generated summaries — auto-compiled, not hand-assembled.',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        </svg>
      )
    },
    {
      title: 'Campaign operations',
      desc: 'Pipelines, approvals, outreach, and creator lists in one place. Move work out of spreadsheets and Slack threads.',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      )
    },
    {
      title: 'Workspace collaboration',
      desc: 'Shared lists, campaigns, and permissions across brand and agency teams. Built for multi-org enterprise use.',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    }
  ];

  return (
    <section id="features" style={{ padding: '80px 0 100px', background: '#ffffff' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px' }}>
        <div
          className="landing-features-grid"
          style={{
            width: '100%',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            overflow: 'hidden',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            background: '#e2e8f0',
            gap: '1px',
          }}
        >
          {features.map((feature, idx) => (
            <div
              key={idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                background: hoveredIdx === idx ? 'rgba(248, 250, 252, 0.6)' : '#ffffff',
                transition: 'background-color 0.2s ease-in-out',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                }}
              >
                {feature.icon}
              </div>
              
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', margin: 0 }}>
                {feature.title}
              </h3>
              
              <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.6, margin: '8px 0 0' }}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
