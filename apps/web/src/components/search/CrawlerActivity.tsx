'use client';

import React from 'react';

interface CrawlerActivityProps {
  searching: boolean;
  searchStep: number;
}

export default function CrawlerActivity({ searching, searchStep }: CrawlerActivityProps) {
  if (!searching) return null;

  const stageDots = [
    { label: 'Validating credits' },
    { label: 'Queueing crawler' },
    { label: 'Enriching profile' },
    { label: 'Scoring IQ metrics' },
  ];

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', margin: '16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '12px' }}>
        <span style={{ color: '#475569', fontWeight: 500 }}>Scanning Networks and Scoring Authenticity...</span>
        <span style={{ color: '#4f46e5', fontWeight: 700 }}>Stage {searchStep} of 4</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginBottom: '24px', padding: '0 10px', marginTop: '16px' }}>
        <div style={{ position: 'absolute', top: '10px', left: 0, right: 0, height: '2px', background: '#e2e8f0', zIndex: 1 }} />
        <div style={{ position: 'absolute', top: '10px', left: 0, width: `${(searchStep / 4) * 100}%`, height: '2px', background: '#4f46e5', zIndex: 2, transition: 'width 0.3s' }} />

        {stageDots.map((stage, i) => {
          const num = i + 1;
          const isPassed = searchStep >= num;
          const isActive = searchStep === num;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 3, width: '80px' }}>
              <div style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: isPassed ? '#4f46e5' : '#ffffff',
                color: isPassed ? '#ffffff' : '#cbd5e1',
                border: `2px solid ${isActive ? '#4f46e5' : '#cbd5e1'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 700,
              }}>
                {num}
              </div>
              <span style={{ fontSize: '10px', color: isPassed ? '#0f172a' : '#94a3b8', marginTop: '6px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
