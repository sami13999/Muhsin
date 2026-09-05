'use client';

import React from 'react';

const USAGE_HEIGHTS = [
  50, 48, 47, 65, 52, 53, 62, 51, 59, 44, 46, 50, 42, 38, 28, 
  36, 25, 32, 40, 34, 46, 42, 36, 48, 62, 58, 60, 56, 50, 48
];

export default function CreditUsageChart() {
  return (
    <div style={{ 
      background: '#ffffff', 
      border: '1px solid #e2e8f0', 
      borderRadius: '16px', 
      padding: '24px', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '24px',
      flex: 1,
      minWidth: 0,
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Title & Stats Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Credit usage</h3>
          <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginTop: '3px' }}>Last 30 days</span>
        </div>
        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Daily avg - 312</span>
      </div>

      {/* Chart Canvas */}
      <div style={{ 
        height: '160px', 
        display: 'flex', 
        alignItems: 'flex-end', 
        justifyContent: 'space-between', 
        gap: '4px',
        borderBottom: '1px solid #f1f5f9',
        paddingBottom: '8px'
      }}>
        {USAGE_HEIGHTS.map((height, index) => (
          <div 
            key={index} 
            style={{ 
              flex: 1, 
              height: `${height}%`, 
              background: 'linear-gradient(180deg, #6366f1 0%, rgba(99, 102, 241, 0.15) 100%)', 
              borderRadius: '4px 4px 0 0',
              minWidth: '4px',
              maxWidth: '12px'
            }} 
          />
        ))}
      </div>
    </div>
  );
}
