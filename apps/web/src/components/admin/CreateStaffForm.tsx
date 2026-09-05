'use client';

import React, { useState } from 'react';

interface CreateStaffFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CreateStaffForm({ onSuccess, onCancel }: CreateStaffFormProps) {
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    displayName: '',
    role: 'support' as 'admin' | 'support',
    department: '',
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!createForm.email || !createForm.password || !createForm.displayName) {
      setCreateError('Email, password, and name are required');
      return;
    }

    setCreateLoading(true);
    setCreateError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/admin/staff`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('mushin_token') ?? ''}`,
            'X-Workspace-ID': localStorage.getItem('workspaceId') ?? '',
          },
          body: JSON.stringify(createForm),
        }
      );

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        setCreateError(data.error?.message ?? 'Failed to create staff user');
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create staff user');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '24px', marginBottom: '24px' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', margin: 0 }}>Create Staff User</h2>

      {createError && (
        <p style={{ color: '#ef4444', marginBottom: '16px' }}>{createError}</p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>Email</label>
          <input
            type="email"
            value={createForm.email}
            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>Password</label>
          <input
            type="password"
            value={createForm.password}
            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>Display Name</label>
          <input
            type="text"
            value={createForm.displayName}
            onChange={(e) => setCreateForm({ ...createForm, displayName: e.target.value })}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>Role</label>
          <select
            value={createForm.role}
            onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as 'admin' | 'support' })}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
          >
            <option value="support">Support</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>Department (optional)</label>
          <input
            type="text"
            value={createForm.department}
            onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
          />
        </div>
      </div>

      <button
        onClick={handleCreate}
        disabled={createLoading}
        style={{
          marginTop: '16px',
          padding: '10px 20px',
          background: '#22c55e',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          cursor: createLoading ? 'not-allowed' : 'pointer',
          opacity: createLoading ? 0.7 : 1,
        }}
      >
        {createLoading ? 'Creating...' : 'Create Staff User'}
      </button>
    </div>
  );
}
