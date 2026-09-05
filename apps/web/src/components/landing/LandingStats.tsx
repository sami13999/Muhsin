'use client';

import React from 'react';

export default function LandingStats() {
  const stats = [
    { num: '99.99%', label: 'Uptime SLA' },
    { num: '8.4B+', label: 'Events processed daily' },
    { num: '<120ms', label: 'p95 query latency' },
    { num: '40%', label: 'Avg. lift in conversion' }
  ];

  return (
    <section
      style={{
        padding: '80px 24px',
        background: '#ffffff',
        borderBottom: '1px solid rgba(226, 232, 240, 0.6)',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '40px 24px', // gap-y-10 is 40px
          textAlign: 'center',
        }}
      >
        {stats.map((s, idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '44px',
                fontWeight: 700,
                color: '#0f172a',
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
              }}
            >
              {s.num}
            </span>
            <span
              style={{
                fontSize: '13px',
                color: '#64748b',
                fontWeight: 500,
                marginTop: '8px',
                letterSpacing: '0.01em',
              }}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
