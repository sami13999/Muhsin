'use client';

import { useEffect, useState } from 'react';

interface Workspace {
  workspaceId: string;
  name: string;
  slug: string;
  subscriptionState: string;
  subscriptionPlanId: string | null;
  createdAt: string;
}

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadWorkspaces() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/staff/workspaces`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('mushin_token') ?? ''}`,
              'X-Workspace-ID': localStorage.getItem('workspaceId') ?? '',
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          setWorkspaces(data.data ?? []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load workspaces');
      } finally {
        setLoading(false);
      }
    }
    loadWorkspaces();
  }, []);

  const filteredWorkspaces = workspaces.filter(ws =>
    ws.name.toLowerCase().includes(search.toLowerCase()) ||
    ws.slug.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <p>Loading workspaces...</p>;
  }

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '24px' }}>Workspaces</h1>

      {error && (
        <p style={{ color: '#ef4444', marginBottom: '16px' }}>{error}</p>
      )}

      {/* Search */}
      <div style={{ marginBottom: '24px' }}>
        <input
          type="text"
          placeholder="Search workspaces..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '10px 12px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>

      {/* Workspaces Table */}
      <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>Name</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>Slug</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>Plan</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {filteredWorkspaces.map((ws) => (
              <tr key={ws.workspaceId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 16px', fontSize: '14px' }}>{ws.name}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#64748b' }}>{ws.slug}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    background: ws.subscriptionState === 'active' ? '#dcfce7' :
                                ws.subscriptionState === 'trialing' ? '#fef3c7' :
                                '#fee2e2',
                    color: ws.subscriptionState === 'active' ? '#166534' :
                           ws.subscriptionState === 'trialing' ? '#92400e' :
                           '#991b1b',
                  }}>
                    {ws.subscriptionState}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px' }}>{ws.subscriptionPlanId ?? 'free'}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#64748b' }}>
                  {new Date(ws.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
