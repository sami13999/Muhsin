'use client';

import React from 'react';
import AdminLoginForm from '@/components/admin/AdminLoginForm';

export default function AdminLoginPage() {
  return (
    <main className="aurora-bg" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100vh', position: 'relative' }}>
      <div className="aurora-orb orb-indigo" />
      <div className="aurora-orb orb-emerald" />

      {/* Left panel: Info & Logo */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '64px', color: '#ffffff', zIndex: 2, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '48px' }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 24V8L12 18L18 8L24 24" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="15" cy="11" r="2.5" fill="#10b981" />
          </svg>
          <span style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em' }}>MUSHIN · OPS</span>
        </div>

        <h1 style={{ fontSize: '40px', fontWeight: 800, lineHeight: 1.1, marginBottom: '20px', margin: 0 }}>Staff Administration Portal</h1>
        <p style={{ color: '#94a3b8', fontSize: '16px', lineHeight: 1.6, maxWidth: '440px', marginTop: '16px', margin: 0 }}>
          Access workspace matrices, credit refund ledger requests, crawler jobs queue depths, provider health checklists, and settings toggles.
        </p>
      </div>

      {/* Right panel: Login form */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px', zIndex: 2 }}>
        <AdminLoginForm />
      </div>
    </main>
  );
}
