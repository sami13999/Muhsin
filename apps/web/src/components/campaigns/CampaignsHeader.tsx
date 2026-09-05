'use client';

import React from 'react';

interface CampaignsHeaderProps {
  onCreateCampaign: () => void;
}

export default function CampaignsHeader({ onCreateCampaign }: CampaignsHeaderProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <h1 style={{ 
          fontSize: '1.75rem', 
          fontWeight: 600, 
          letterSpacing: '-0.025em',
          color: '#0f172a', 
          margin: 0, 
          fontFamily: "'Inter', sans-serif" 
        }}>
          Campaigns
        </h1>
        <p style={{ 
          color: '#64748b', 
          fontSize: '14px', 
          marginTop: '4px', 
          margin: 0, 
          fontFamily: "'Inter', sans-serif",
          fontWeight: 400
        }}>
          End-to-end influencer campaigns — from outreach to completion.
        </p>
      </div>
      <button 
        onClick={onCreateCampaign}
        style={{ 
          background: '#0f172a', 
          color: '#ffffff', 
          border: 'none', 
          padding: '10px 18px', 
          borderRadius: '8px', 
          fontSize: '13px', 
          fontWeight: 600, 
          cursor: 'pointer',
          fontFamily: "'Inter', sans-serif",
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        + New campaign
      </button>
    </div>
  );
}
