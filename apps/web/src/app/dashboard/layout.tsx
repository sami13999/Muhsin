'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="btn-spinner" style={{ borderTopColor: '#4f46e5', width: '32px', height: '32px', borderWidth: '3px', margin: '0 auto 16px' }} />
          <p style={{ color: '#475569', fontSize: '14px', fontWeight: 500 }}>Loading MUSHIN workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="dashboard-layout-root" style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: '#f8fafc' }}>
      
      {/* ── Sidebar ── */}
      <DashboardSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* ── Main Area ── */}
      <div className="dashboard-main-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', minWidth: 0, overflow: 'hidden' }}>
        
        {/* Header with Mobile Hamburger Toggle */}
        <DashboardHeader onMenuToggle={() => setIsMobileMenuOpen((prev) => !prev)} />

        {/* Content container */}
        <main className="dashboard-content-container" style={{ flex: 1, padding: '32px', overflowY: 'auto', minHeight: 0 }}>
          {children}
        </main>

      </div>

    </div>
  );
}
