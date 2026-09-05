'use client';

import React from 'react';

export default function LogoPreviewPage() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0A0E1A', margin: 0, padding: '24px' }}>
      
      {/* 90% width custom transparent logo image */}
      <img
        src="/logo.png"
        alt="MUSHIN Custom Logo"
        style={{ width: '90%', maxWidth: '600px', height: 'auto', objectFit: 'contain', display: 'block' }}
      />

    </div>
  );
}
