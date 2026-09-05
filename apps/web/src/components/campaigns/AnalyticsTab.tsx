'use client';

import React from 'react';
import { Campaign } from '@/app/dashboard/campaigns/page';

interface AnalyticsTabProps {
  campaign: Campaign;
}

export default function AnalyticsTab({ campaign }: AnalyticsTabProps) {
  const isEid = campaign.name.toLowerCase().includes('eid');
  const isNew = campaign.name.toLowerCase().includes('new');

  const roasVal = isNew ? '0x' : (isEid ? '4.2x' : '3.4x');
  const reachVal = isNew ? '1.42M' : (isEid ? '1.42M' : '4.7M');
  const impressionsVal = isNew ? '4.28M' : (isEid ? '4.28M' : '10.2M');
  const clicksVal = isNew ? '42.1K' : (isEid ? '42.1K' : '98.5K');
  const cpmVal = isNew ? 'Rs. 84' : (isEid ? 'Rs. 84' : 'Rs. 72');

  const stats = [
    { label: 'REACH', value: reachVal },
    { label: 'IMPRESSIONS', value: impressionsVal },
    { label: 'CLICKS', value: clicksVal },
    { label: 'ROAS', value: roasVal },
    { label: 'CPM', value: cpmVal }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
        {stats.map((s) => (
          <div key={s.label} style={{ padding: '20px 16px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.01)' }}>
            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, display: 'block', letterSpacing: '0.05em' }}>
              {s.label}
            </span>
            <strong style={{ display: 'block', fontSize: '20px', color: '#0f172a', marginTop: '8px', fontWeight: 700 }}>
              {s.value}
            </strong>
          </div>
        ))}
      </div>

      {/* Chart Panel */}
      <div style={{ padding: '24px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.01)' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '24px', margin: 0 }}>
          Performance over time
        </h4>
        
        {/* Inline SVG Curve Chart representing a premium visual */}
        <div style={{ width: '100%', height: '200px', position: 'relative' }}>
          <svg viewBox="0 0 800 200" width="100%" height="100%" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.2"/>
                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0"/>
              </linearGradient>
            </defs>
            {/* Grid Lines */}
            <line x1="0" y1="50" x2="800" y2="50" stroke="#f1f5f9" strokeWidth="1" />
            <line x1="0" y1="100" x2="800" y2="100" stroke="#f1f5f9" strokeWidth="1" />
            <line x1="0" y1="150" x2="800" y2="150" stroke="#f1f5f9" strokeWidth="1" />
            
            {/* Gradient Fill Path */}
            <path d="M 0 170 C 150 160, 250 120, 400 90 C 550 60, 650 30, 800 20 L 800 200 L 0 200 Z" fill="url(#chartGrad)" />
            
            {/* Stroke Line Path */}
            <path d="M 0 170 C 150 160, 250 120, 400 90 C 550 60, 650 30, 800 20" fill="none" stroke="#4f46e5" strokeWidth="3" />
          </svg>
        </div>
      </div>
    </div>
  );
}
