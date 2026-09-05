'use client';

import React from 'react';
import LoginFormCard from '@/components/auth/LoginFormCard';

export default function LoginPage() {
  return (
    <main className="aurora-bg" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '24px' }}>
      {/* Background Orbs */}
      <div className="aurora-orb orb-indigo" />
      <div className="aurora-orb orb-emerald" />

      <LoginFormCard />
    </main>
  );
}
