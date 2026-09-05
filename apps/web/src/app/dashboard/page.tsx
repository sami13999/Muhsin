'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import KPICards from '@/components/dashboard/KPICards';
import UsageAnalytics from '@/components/dashboard/UsageAnalytics';
import RecentSearches from '@/components/dashboard/RecentSearches';
import SavedLists from '@/components/dashboard/SavedLists';
import CampaignsCard from '@/components/dashboard/CampaignsCard';
import RecentActivity from '@/components/dashboard/RecentActivity';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ height: '40px', width: '300px', borderRadius: '6px' }} className="shimmer" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <div style={{ height: '140px', borderRadius: '12px' }} className="shimmer" />
          <div style={{ height: '140px', borderRadius: '12px' }} className="shimmer" />
          <div style={{ height: '140px', borderRadius: '12px' }} className="shimmer" />
        </div>
      </div>
    );
  }

  const name = user?.name ? user.name.split(' ')[0] : 'Ayesha';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Welcome Greeting Row */}
      <div className="dashboard-welcome-header">
        <div>
          <h1 style={{ fontSize: 'clamp(1.35rem, 3.5vw, 1.75rem)', fontWeight: 700, color: '#0f172a', margin: 0, fontFamily: "'Inter', sans-serif" }}>
            Welcome back, {name}
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: '6px 0 0', fontFamily: "'Inter', sans-serif" }}>
            Here&apos;s what&apos;s happening across your MUSHIN workspace today.
          </p>
        </div>
        
        {/* Top Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => router.push('/dashboard/lists')}
            style={{ display: 'inline-flex', alignItems: 'center', background: '#ffffff', color: '#0F172A', border: '1px solid #CBD5E1', padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
              <path d="M12 5v14M5 12h14" />
            </svg>
            New list
          </button>
          <button 
            onClick={() => router.push('/dashboard/search')}
            style={{ display: 'inline-flex', alignItems: 'center', background: '#0F172A', color: '#ffffff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            New search
          </button>
        </div>
      </div>

      <KPICards />

      {/* Grid: Usage Analytics & Recent Searches */}
      <div className="dashboard-grid-2-1">
        <UsageAnalytics />
        <RecentSearches />
      </div>

      {/* Grid: Saved Lists & Campaigns */}
      <div className="dashboard-grid-2-1">
        <SavedLists />
        <CampaignsCard />
      </div>

      {/* Workspace Activity Row */}
      <RecentActivity />

    </div>
  );
}
