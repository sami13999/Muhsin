'use client';

import React from 'react';

export default function BillingHeader() {
  return (
    <div>
      <h1 style={{ 
        fontSize: '1.75rem', 
        fontWeight: 600, 
        letterSpacing: '-0.025em',
        color: '#0f172a', 
        margin: 0, 
        fontFamily: "'Inter', sans-serif" 
      }}>
        Credits & billing
      </h1>
      <p style={{ 
        color: '#64748b', 
        fontSize: '14px', 
        marginTop: '4px', 
        margin: 0, 
        fontFamily: "'Inter', sans-serif",
        fontWeight: 400
      }}>
        Track usage, manage spend caps, and upgrade your plan.
      </p>
    </div>
  );
}
