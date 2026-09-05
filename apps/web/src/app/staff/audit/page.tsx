'use client';

import { useState } from 'react';

interface AuditLog {
  audit_id: string;
  staff_user_id: string;
  staff_role: string;
  action: string;
  target_type: string;
  target_id: string;
  workspace_id: string | null;
  reason: string | null;
  request_id: string;
  occurred_at: string;
}

export default function AuditLogPage() {
  const [workspaceId, setWorkspaceId] = useState('');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadAuditLogs() {
    if (!workspaceId.trim()) {
      setError('Please enter a workspace ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/staff/audit/${workspaceId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('mushin_token') ?? ''}`,
            'X-Workspace-ID': localStorage.getItem('workspaceId') ?? '',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLogs(data.data ?? []);
      } else {
        setError('Failed to load audit logs');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '24px' }}>Audit Log</h1>

      {/* Workspace ID Input */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <input
          type="text"
          placeholder="Workspace ID"
          value={workspaceId}
          onChange={(e) => setWorkspaceId(e.target.value)}
          style={{
            width: '300px',
            padding: '10px 12px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            fontSize: '14px',
            fontFamily: 'monospace',
          }}
        />
        <button
          onClick={loadAuditLogs}
          disabled={loading}
          style={{
            padding: '10px 20px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Loading...' : 'Load Audit Logs'}
        </button>
      </div>

      {error && (
        <p style={{ color: '#ef4444', marginBottom: '16px' }}>{error}</p>
      )}

      {/* Audit Logs */}
      {logs.length > 0 && (
        <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>Time</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>Action</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>Target</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>Staff</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>Reason</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.audit_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#64748b' }}>
                    {new Date(log.occurred_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      background: log.action.includes('suspend') || log.action.includes('revoke') ? '#fee2e2' :
                                  log.action.includes('create') || log.action.includes('promote') ? '#dcfce7' :
                                  '#f1f5f9',
                      color: log.action.includes('suspend') || log.action.includes('revoke') ? '#991b1b' :
                             log.action.includes('create') || log.action.includes('promote') ? '#166534' :
                             '#334155',
                    }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontFamily: 'monospace' }}>
                    {log.target_id.slice(0, 8)}...
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                    {log.staff_role}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#64748b', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.reason ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {logs.length === 0 && !loading && workspaceId.trim() && (
        <p style={{ color: '#64748b' }}>No audit logs found for this workspace</p>
      )}
    </div>
  );
}
