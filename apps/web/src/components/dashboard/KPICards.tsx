'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function KPICards() {
  const router = useRouter();

  const [credits, setCredits] = React.useState<number | null>(null);

  React.useEffect(() => {
    let mounted = true;

    async function loadWorkspaceCredits() {
      try {
        const res = await api.listWorkspaces();
        if (mounted && res?.data?.[0]) {
          // If workspace returned, update state
          const saved = localStorage.getItem('mushin_credits');
          setCredits(saved ? Number(saved) : 100000);
          return;
        }
      } catch {
        // Fallback to local storage state
      }
      if (mounted) {
        const saved = localStorage.getItem('mushin_credits');
        setCredits(saved ? Number(saved) : 100000);
      }
    }

    loadWorkspaceCredits();

    const handleSync = () => {
      const cur = localStorage.getItem('mushin_credits');
      if (cur && mounted) setCredits(Number(cur));
    };
    window.addEventListener('mushin_credits_update', handleSync);
    return () => {
      mounted = false;
      window.removeEventListener('mushin_credits_update', handleSync);
    };
  }, []);

  const actions = [
    { 
      title: 'Start a search', 
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>, 
      bg: '#eef2ff', 
      color: '#4f46e5', 
      link: '/dashboard/search' 
    },
    { 
      title: 'New list', 
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5v14" /></svg>, 
      bg: '#f0fdf4', 
      color: '#10b981', 
      link: '/dashboard/lists' 
    },
    { 
      title: 'New campaign', 
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      ), 
      bg: '#fff7ed', 
      color: '#f97316', 
      link: '/dashboard/campaigns' 
    },
    { 
      title: 'Top up credits', 
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>, 
      bg: '#faf5ff', 
      color: '#a855f7', 
      link: '/dashboard/billing?topup=true' 
    }
  ];

  const features = ['Multi-platform discovery', 'Bot detection & IQ scoring', 'Priority enrichment'];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
      
      {/* 1. Credit Balance Card */}
      <div style={{ padding: '24px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', flexDirection: 'column', height: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#64748b', margin: 0 }}>Credit balance</h3>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Search + enrichment pool</span>
          </div>
          <span style={{ fontSize: '11px', background: '#ecfdf5', color: '#10b981', padding: '4px 10px', borderRadius: '9999px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            Healthy
          </span>
        </div>
        <div style={{ margin: '16px 0 8px' }}>
          <span style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', display: 'block', lineHeight: 1.1 }}>{(credits ?? 100000).toLocaleString()}</span>
          <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginTop: '4px' }}>of 100,000 monthly credits</span>
        </div>
        <div style={{ background: '#f1f5f9', height: '8px', borderRadius: '9999px', overflow: 'hidden', margin: '12px 0 20px' }}>
          <div style={{ width: `${Math.min(100, Math.max(0, ((credits ?? 100000) / 100000) * 100))}%`, background: '#10b981', height: '100%', borderRadius: '9999px' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', marginTop: 'auto' }}>
          <span style={{ color: '#94a3b8' }}>Renews on Aug 3</span>
          <span onClick={() => router.push('/dashboard/billing?topup=true')} style={{ color: '#4f46e5', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>Top up ↗</span>
        </div>
      </div>

      {/* 2. Subscription Card */}
      <div style={{ padding: '24px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', flexDirection: 'column', height: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#64748b', margin: 0 }}>Subscription</h3>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Growth - Monthly</span>
          </div>
          <span style={{ fontSize: '11px', background: '#f3e8ff', color: '#7c3aed', padding: '4px 10px', borderRadius: '9999px', fontWeight: 700 }}>Active</span>
        </div>
        <div style={{ margin: '12px 0 4px' }}>
          <span style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>Rs. 24,500</span>
          <span style={{ fontSize: '14px', color: '#64748b' }}> / month</span>
        </div>
        <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px 0' }}>Renews Jul 04 · JazzCash •••• 8241</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          {features.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569' }}>
              <span style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                width: '18px', 
                height: '18px', 
                borderRadius: '50%', 
                background: '#ecfdf5', 
                color: '#10b981',
                fontSize: '11px',
                fontWeight: 800,
                marginRight: '8px',
                flexShrink: 0
              }}>✓</span>
              <span>{f}</span>
            </div>
          ))}
        </div>
        <button onClick={() => router.push('/dashboard/billing')} style={{ width: '100%', padding: '10px', fontSize: '13px', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', color: '#0f172a', cursor: 'pointer', marginTop: 'auto' }}>
          Manage subscription ↗
        </button>
      </div>

      {/* 3. Quick Actions Card */}
      <div style={{ padding: '24px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', flexDirection: 'column', height: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#64748b', margin: '0 0 4px 0' }}>Quick actions</h3>
        <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 20px 0' }}>Start something new</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', flex: 1 }}>
          {actions.map((act) => (
            <div
              key={act.title}
              onClick={() => router.push(act.link)}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: '#ffffff'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.03)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', width: '28px', height: '28px', borderRadius: '6px', background: act.bg, color: act.color, alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                {act.icon}
              </div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>{act.title}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
