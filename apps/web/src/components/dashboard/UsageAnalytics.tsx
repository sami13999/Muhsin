'use client';

import React, { useState } from 'react';

export default function UsageAnalytics() {
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');

  // Hardcoded mockup data to match Figma exactly
  const rangeLabels = {
    '7d': '7d',
    '30d': '30d',
    '90d': '90d'
  };

  return (
    <div style={{ 
      padding: '24px', 
      background: '#ffffff', 
      border: '1px solid #e2e8f0', 
      borderRadius: '12px', 
      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Usage analytics</h3>
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>Searches, enrichments, and Events</p>
        </div>
        
        {/* Range Toggle */}
        <div style={{ display: 'flex', background: '#f1f5f9', padding: '2px', borderRadius: '6px' }}>
          {(['7d', '30d', '90d'] as const).map((r) => (
            <button
              key={r}
              style={{
                background: range === r ? '#ffffff' : 'transparent',
                color: range === r ? '#0f172a' : '#64748b',
                fontSize: '11px',
                fontWeight: 600,
                padding: '4px 12px',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
              }}
              onClick={() => setRange(r)}
            >
              {rangeLabels[r]}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Line Area Chart */}
      <div style={{ position: 'relative', height: '140px', width: '100%', marginBottom: '24px' }}>
        <svg 
          viewBox="0 0 500 120" 
          width="100%" 
          height="100%" 
          preserveAspectRatio="none"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          
          {/* Area Fill */}
          <path
            d="M 0 90 C 60 55, 100 62, 150 48 C 200 32, 240 50, 290 38 C 340 25, 390 35, 440 28 C 470 22, 485 18, 500 12 L 500 120 L 0 120 Z"
            fill="url(#chartGradient)"
          />
          
          {/* Line Path */}
          <path
            d="M 0 90 C 60 55, 100 62, 150 48 C 200 32, 240 50, 290 38 C 340 25, 390 35, 440 28 C 470 22, 485 18, 500 12"
            fill="none"
            stroke="#6366f1"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* 3-KPI Footer */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr 1fr', 
        gap: '16px', 
        borderTop: '1px solid #f1f5f9', 
        paddingTop: '20px' 
      }}>
        <div>
          <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Searches</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '6px' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>1,284</span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#10b981' }}>+12.4%</span>
          </div>
        </div>
        <div>
          <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Enrichments</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '6px' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>8,421</span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#10b981' }}>+3.1%</span>
          </div>
        </div>
        <div>
          <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Events</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '6px' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>23,410</span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#10b981' }}>+24.7%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
