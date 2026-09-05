'use client';

import React from 'react';
import Link from 'next/link';

interface StaffSidebarProps {
  role: 'admin' | 'support' | null;
}

export default function StaffSidebar({ role }: StaffSidebarProps) {
  return (
    <aside style={{ width: '240px', background: '#1e293b', color: 'white', padding: '20px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>MUSHIN Staff</h2>
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0' }}>
          {role === 'admin' ? 'Admin Panel' : 'Support Panel'}
        </p>
      </div>

      <nav style={{ flex: 1 }}>
        <Link href="/staff" style={{ display: 'block', padding: '10px 12px', borderRadius: '6px', marginBottom: '4px', fontSize: '14px', color: 'white' }}>
          Overview
        </Link>
        <Link href="/staff/workspaces" style={{ display: 'block', padding: '10px 12px', borderRadius: '6px', marginBottom: '4px', fontSize: '14px', color: '#cbd5e1' }}>
          Workspaces
        </Link>
        <Link href="/staff/customers" style={{ display: 'block', padding: '10px 12px', borderRadius: '6px', marginBottom: '4px', fontSize: '14px', color: '#cbd5e1' }}>
          Customers
        </Link>
        <Link href="/staff/search" style={{ display: 'block', padding: '10px 12px', borderRadius: '6px', marginBottom: '4px', fontSize: '14px', color: '#cbd5e1' }}>
          Search Diagnostics
        </Link>
        <Link href="/staff/audit" style={{ display: 'block', padding: '10px 12px', borderRadius: '6px', marginBottom: '4px', fontSize: '14px', color: '#cbd5e1' }}>
          Audit Log
        </Link>
        <Link href="/staff/credits" style={{ display: 'block', padding: '10px 12px', borderRadius: '6px', marginBottom: '4px', fontSize: '14px', color: '#cbd5e1' }}>
          Credits
        </Link>

        {role === 'admin' && (
          <>
            <div style={{ borderTop: '1px solid #334155', margin: '16px 0' }} />
            <Link href="/admin" style={{ display: 'block', padding: '10px 12px', borderRadius: '6px', marginBottom: '4px', fontSize: '14px', color: '#f59e0b' }}>
              Admin Panel
            </Link>
          </>
        )}
      </nav>

      <div style={{ borderTop: '1px solid #334155', paddingTop: '16px' }}>
        <Link href="/dashboard" style={{ color: '#94a3b8', fontSize: '13px' }}>
          ← Back to Dashboard
        </Link>
      </div>
    </aside>
  );
}
