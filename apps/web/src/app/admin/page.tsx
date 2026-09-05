'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/toast';
import AdminOverview from '@/components/admin/AdminOverview';
import AdminUsers from '@/components/admin/AdminUsers';
import AdminBilling from '@/components/admin/AdminBilling';
import AdminRevenue from '@/components/admin/AdminRevenue';
import AdminSearchOps from '@/components/admin/AdminSearchOps';
import AdminProviders from '@/components/admin/AdminProviders';
import AdminSecurity from '@/components/admin/AdminSecurity';
import AdminSupport from '@/components/admin/AdminSupport';
import AdminMonitoring from '@/components/admin/AdminMonitoring';
import AdminSettings from '@/components/admin/AdminSettings';

interface StaffSession {
  name: string;
  role: 'admin' | 'support';
  email: string;
}

export default function AdminConsolePage() {
  const router = useRouter();
  const toast = useToast();

  const [session, setSession] = useState<StaffSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'billing' | 'revenue' | 'search' | 'providers' | 'security' | 'support' | 'monitoring' | 'settings'>('overview');

  useEffect(() => {
    const raw = localStorage.getItem('mushin_staff_session');
    if (!raw) {
      router.push('/admin/login');
    } else {
      setSession(JSON.parse(raw));
      setLoading(false);
    }
  }, [router]);

  const handleSignOut = () => {
    localStorage.removeItem('mushin_staff_session');
    toast.success('Logged out', 'Staff session terminated.');
    router.push('/admin/login');
  };

  const handleImpersonateUser = (email: string) => {
    localStorage.setItem('mushin_impersonated_email', email);
    toast.info('Impersonation Mode Active', `Entering workspace as user: ${email}`);
    router.push('/dashboard');
  };

  if (loading || !session) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0b0f19' }}>
        <div className="btn-spinner" style={{ width: '32px', height: '32px', borderTopColor: '#4f46e5' }} />
      </div>
    );
  }

  const navItems = [
    { key: 'overview', name: 'System Overview', icon: '📊' },
    { key: 'users', name: 'Users Manager', icon: '👥' },
    { key: 'billing', name: 'Credits & Billing', icon: '💳' },
    { key: 'revenue', name: 'Revenue Metrics', icon: '📈' },
    { key: 'search', name: 'Search Operations', icon: '🔍' },
    { key: 'providers', name: 'Platform Providers', icon: '📡' },
    { key: 'security', name: 'Security Center', icon: '🛡️' },
    { key: 'support', name: 'Support Queue', icon: '🎟️' },
    { key: 'monitoring', name: 'System Monitors', icon: '⏱️' },
    { key: 'settings', name: 'Feature Flags', icon: '⚙️' },
  ] as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#0f172a', color: '#f1f5f9' }}>
      <header style={{ height: '64px', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 24V8L12 18L18 8L24 24" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="15" cy="11" r="2.5" fill="#10b981" />
          </svg>
          <span style={{ fontSize: '16px', fontWeight: 700 }}>MUSHIN · OPS</span>
          <span style={{ fontSize: '10px', background: '#3b82f6', color: '#ffffff', padding: '2px 8px', borderRadius: '9999px', fontWeight: 700, textTransform: 'uppercase' }}>{session.role}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>Logged in: <strong>{session.name}</strong></span>
          <button onClick={handleSignOut} className="premium-btn secondary" style={{ padding: '6px 14px', fontSize: '12px', background: 'transparent', color: '#f1f5f9', borderColor: '#475569', cursor: 'pointer' }}>Sign out</button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1 }}>
        <aside style={{ width: '220px', background: '#1e293b', padding: '24px 16px', borderRight: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {navItems.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, border: 'none', textAlign: 'left', background: activeTab === tab.key ? '#334155' : 'transparent', color: activeTab === tab.key ? '#10b981' : '#cbd5e1', cursor: 'pointer', transition: 'all 0.2s' }}>
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </aside>

        <main style={{ flex: 1, padding: '32px', overflowX: 'auto' }}>
          {activeTab === 'overview' && <AdminOverview />}
          {activeTab === 'users' && <AdminUsers onImpersonate={handleImpersonateUser} />}
          {activeTab === 'billing' && <AdminBilling />}
          {activeTab === 'revenue' && <AdminRevenue />}
          {activeTab === 'search' && <AdminSearchOps />}
          {activeTab === 'providers' && <AdminProviders />}
          {activeTab === 'security' && <AdminSecurity />}
          {activeTab === 'support' && <AdminSupport />}
          {activeTab === 'monitoring' && <AdminMonitoring />}
          {activeTab === 'settings' && <AdminSettings />}
        </main>
      </div>
    </div>
  );
}
