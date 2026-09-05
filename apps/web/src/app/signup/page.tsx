'use client';

import React from 'react';
import SignupFormCard from '@/components/auth/SignupFormCard';

export default function SignupPage() {
  return (
    <main className="aurora-bg" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '24px' }}>
      {/* Background Orbs */}
      <div className="aurora-orb orb-indigo" />
      <div className="aurora-orb orb-emerald" />

      <SignupFormCard />
    </main>
  );
}
