'use client';

import React from 'react';
import { useToast } from '@/lib/toast';

export default function CreatorsTab() {
  const toast = useToast();
  const headers = ['CREATOR', 'PLATFORM', 'FOLLOWERS', 'AUTH', 'FEE STAGE', 'PRIORITY'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: "'Inter', sans-serif" }}>
      {/* Table Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
          0 creators in this campaign
        </span>
        <button 
          onClick={() => toast.info('Add Creator', 'Add creator drawer opened.')}
          style={{ 
            background: '#0f172a', 
            color: '#ffffff', 
            border: 'none', 
            padding: '8px 14px', 
            borderRadius: '6px', 
            fontSize: '12px', 
            fontWeight: 700, 
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif"
          }}
        >
          + Add creator
        </button>
      </div>

      {/* Table Grid Wrapper */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', background: '#ffffff' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr 1fr', 
          padding: '12px 16px', 
          background: '#f8fafc', 
          borderBottom: '1px solid #e2e8f0' 
        }}>
          {headers.map((h) => (
            <span key={h} style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em' }}>
              {h}
            </span>
          ))}
        </div>
        <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
          No creators added to this campaign yet.
        </div>
      </div>
    </div>
  );
}
