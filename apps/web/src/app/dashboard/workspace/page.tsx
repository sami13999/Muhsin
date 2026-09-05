'use client';

import React from 'react';

export default function WorkspacePage() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '60vh', 
      fontFamily: "'Inter', sans-serif",
      textAlign: 'center',
      padding: '24px'
    }}>
      {/* Centered Icon Container */}
      <div style={{ 
        width: '48px', 
        height: '48px', 
        background: '#ffffff', 
        border: '1px solid #cbd5e1', 
        borderRadius: '12px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        marginBottom: '20px'
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 18V8h16v10" />
          <path d="M2 20h20" />
          <path d="M8 8V4h8v4" />
          <path d="M9 13h6" />
        </svg>
      </div>

      {/* Main Titles */}
      <h2 style={{ 
        fontSize: '24px', 
        fontWeight: 700, 
        color: '#0f172a', 
        margin: 0 
      }}>
        Workspace
      </h2>
      <p style={{ 
        fontSize: '13px', 
        color: '#64748b', 
        margin: '12px 0 24px', 
        maxWidth: '360px', 
        lineHeight: 1.5 
      }}>
        Manage members, roles, and invitations from Settings → Workspace.
      </p>

      {/* Coming Soon Pill Badge */}
      <div style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '6px', 
        background: '#fff7ed', 
        color: '#c2410c', 
        border: '1px solid #ffedd5', 
        padding: '6px 14px', 
        borderRadius: '9999px', 
        fontSize: '11px', 
        fontWeight: 600 
      }}>
        <span style={{ color: '#ea580c', fontSize: '12px' }}>•</span>
        Coming in next iteration
      </div>
    </div>
  );
}
