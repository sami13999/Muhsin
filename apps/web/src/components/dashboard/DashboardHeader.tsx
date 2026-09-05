'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import NotificationCenter from '@/components/NotificationCenter';

interface DashboardHeaderProps {
  onMenuToggle?: () => void;
}

export default function DashboardHeader({ onMenuToggle }: DashboardHeaderProps) {
  const { user } = useAuth();
  const router = useRouter();

  const [credits, setCredits] = React.useState(84140);
  const [profileName, setProfileName] = React.useState('Ayesha Malik');
  const [profileAvatar, setProfileAvatar] = React.useState('https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80');

  React.useEffect(() => {
    if (!localStorage.getItem('mushin_credits')) {
      localStorage.setItem('mushin_credits', '84140');
    } else {
      setCredits(Number(localStorage.getItem('mushin_credits')));
    }

    const savedProf = localStorage.getItem('mushin_user_profile');
    if (savedProf) {
      try {
        const parsed = JSON.parse(savedProf);
        if (parsed.name) setProfileName(parsed.name);
        if (parsed.avatarUrl) setProfileAvatar(parsed.avatarUrl);
      } catch {}
    }

    const handleSync = () => {
      const cur = localStorage.getItem('mushin_credits');
      if (cur) setCredits(Number(cur));
    };

    const handleProfileSync = (e: any) => {
      const p = e.detail;
      if (p?.name) setProfileName(p.name);
      if (p?.avatarUrl) setProfileAvatar(p.avatarUrl);
    };

    window.addEventListener('mushin_credits_update', handleSync);
    window.addEventListener('mushin_profile_update', handleProfileSync);
    return () => {
      window.removeEventListener('mushin_credits_update', handleSync);
      window.removeEventListener('mushin_profile_update', handleProfileSync);
    };
  }, []);

  if (!user) return null;

  const displayName = profileName || user.name || 'Ayesha Malik';
  const email = user.email || 'you@mushin.pk';

  return (
    <header
      className="dashboard-header"
      style={{
        height: '72px',
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        boxSizing: 'border-box',
      }}
    >
      {/* Left side: Hamburger button + Search bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Mobile Hamburger Menu Toggle */}
        <button
          onClick={onMenuToggle}
          className="mobile-hamburger-btn"
          style={{
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '18px',
            cursor: 'pointer',
            color: '#0f172a',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Open navigation menu"
        >
          ☰
        </button>

        {/* Figma styled search bar trigger */}
        <div
          className="header-search-trigger"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            width: '320px',
            color: '#94a3b8',
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
          onClick={() => router.push('/dashboard/search')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#94a3b8', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" />
          </svg>
          <span className="search-text-full">Search creators, lists, campaigns...</span>
          <span className="search-text-short" style={{ display: 'none' }}>Search...</span>
          <span className="shortcut-badge" style={{ marginLeft: 'auto', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '1px 6px', fontSize: '10px', color: '#64748b', fontWeight: 600 }}>⌘K</span>
        </div>
      </div>

      {/* Right side widgets */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Credit Pill */}
        <div
          className="header-credit-pill"
          onClick={() => router.push('/dashboard/billing?topup=true')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            borderRadius: '9999px',
            padding: '6px 14px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#0f172a',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#10b981', flexShrink: 0 }}>
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
          <span className="credit-label" style={{ color: '#64748b', fontWeight: 500 }}>Credits</span>
          <span style={{ fontWeight: 700 }}>{credits.toLocaleString()}</span>
        </div>

        {/* Notifications */}
        <NotificationCenter />

        {/* Profile widget */}
        <div className="header-user-widget" style={{ display: 'flex', alignItems: 'center', gap: '10px', borderLeft: '1px solid #e2e8f0', paddingLeft: '16px' }}>
          <div className="header-user-text" style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', lineHeight: 1.2, whiteSpace: 'nowrap' }}>{displayName}</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', lineHeight: 1, whiteSpace: 'nowrap' }}>{email}</div>
          </div>

          <img
            src={profileAvatar}
            alt={displayName}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              border: '2px solid #ffffff',
              boxShadow: '0 0 0 1px #cbd5e1',
              objectFit: 'cover',
              flexShrink: 0,
            }}
          />
        </div>
      </div>
    </header>
  );
}
