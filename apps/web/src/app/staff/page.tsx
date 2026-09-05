'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface WorkspaceSummary {
  total: number;
  active: number;
  trialing: number;
}

interface StaffOverview {
  workspaces: WorkspaceSummary;
  recentActivity: Array<{
    action: string;
    targetType: string;
    targetId: string;
    occurredAt: string;
  }>;
}

export default function StaffOverviewPage() {
  const [overview, setOverview] = useState<StaffOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch workspace stats
        const workspaces = await api.listWorkspaces();
        const wsList = workspaces.data ?? [];

        setOverview({
          workspaces: {
            total: wsList.length,
            active: wsList.filter((w) => (w.workspace as { subscriptionState?: string })?.subscriptionState === 'active').length,
            trialing: wsList.filter((w) => (w.workspace as { subscriptionState?: string })?.subscriptionState === 'trialing').length,
          },
          recentActivity: [],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load overview');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return <p>Loading staff overview...</p>;
  }

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '24px' }}>Staff Overview</h1>

      {error && (
        <p style={{ color: '#ef4444', marginBottom: '16px' }}>{error}</p>
      )}

      {/* Workspace Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>Total Workspaces</p>
          <p style={{ fontSize: '28px', fontWeight: 600 }}>{overview?.workspaces.total ?? 0}</p>
        </div>
        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>Active Subscriptions</p>
          <p style={{ fontSize: '28px', fontWeight: 600, color: '#22c55e' }}>{overview?.workspaces.active ?? 0}</p>
        </div>
        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>Trialing</p>
          <p style={{ fontSize: '28px', fontWeight: 600, color: '#f59e0b' }}>{overview?.workspaces.trialing ?? 0}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Quick Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <a href="/staff/workspaces" style={{
              display: 'block',
              padding: '10px',
              background: '#f1f5f9',
              borderRadius: '6px',
              fontSize: '14px',
              textAlign: 'center',
              textDecoration: 'none',
              color: '#334155',
            }}>
              View All Workspaces
            </a>
            <a href="/staff/customers" style={{
              display: 'block',
              padding: '10px',
              background: '#f1f5f9',
              borderRadius: '6px',
              fontSize: '14px',
              textAlign: 'center',
              textDecoration: 'none',
              color: '#334155',
            }}>
              Search Customers
            </a>
            <a href="/staff/audit" style={{
              display: 'block',
              padding: '10px',
              background: '#f1f5f9',
              borderRadius: '6px',
              fontSize: '14px',
              textAlign: 'center',
              textDecoration: 'none',
              color: '#334155',
            }}>
              View Audit Log
            </a>
          </div>
        </div>

        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Recent Activity</h2>
          {overview?.recentActivity && overview.recentActivity.length > 0 ? (
            <div>
              {overview.recentActivity.slice(0, 5).map((activity, i) => (
                <div key={i} style={{ padding: '8px 0', borderTop: '1px solid #f1f5f9' }}>
                  <p style={{ fontSize: '14px' }}>{activity.action}</p>
                  <p style={{ fontSize: '12px', color: '#64748b' }}>{activity.occurredAt}</p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#64748b', fontSize: '14px' }}>No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
}
