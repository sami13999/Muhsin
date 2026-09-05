/**
 * MUSHIN 2.0 Admin Layout
 * Transparent wrapper ensuring the Admin app layout is completely independent
 * of the standard customer dashboard auth layout and boundaries.
 */

'use client';

import React from 'react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: '100vh', background: '#0f172a' }}>
      {children}
    </div>
  );
}
