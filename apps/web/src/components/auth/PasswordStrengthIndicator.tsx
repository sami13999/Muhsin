'use client';

import React from 'react';

interface StrengthProps {
  strength: number;
  label: string;
  color: string;
  visible: boolean;
}

export default function PasswordStrengthIndicator({ strength, label, color, visible }: StrengthProps) {
  return (
    <div style={{ transitionDelay: '280ms' }} className={`stagger-item ${visible ? 'visible' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
        <span style={{ color: '#64748b' }}>Password strength</span>
        <span style={{ color: color, fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ background: '#e2e8f0', height: '4px', borderRadius: '2px', overflow: 'hidden' }}>
        <div
          className="password-strength-bar"
          style={{
            width: `${((strength + 1) / 4) * 100}%`,
            backgroundColor: color,
            height: '100%',
            transition: 'all 0.3s ease'
          }}
        />
      </div>
    </div>
  );
}
