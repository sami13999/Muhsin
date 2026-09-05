'use client';

import { useEffect, useState } from 'react';
import StaffTable from '@/components/admin/StaffTable';
import CreateStaffForm from '@/components/admin/CreateStaffForm';

interface StaffUser {
  staffUserId: string;
  displayName: string;
  email: string;
  role: 'admin' | 'support';
  department: string | null;
  createdAt: string;
}

export default function StaffManagementPage() {
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadStaffUsers();
  }, []);

  async function loadStaffUsers() {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/admin/staff`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('mushin_token') ?? ''}`,
            'X-Workspace-ID': localStorage.getItem('workspaceId') ?? '',
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setStaffUsers(data.data ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  }

  const handleCreateSuccess = () => {
    setShowCreateForm(false);
    loadStaffUsers();
  };

  if (loading) {
    return <p>Loading staff users...</p>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600 }}>Staff Management</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
        >
          {showCreateForm ? 'Cancel' : 'Create Staff User'}
        </button>
      </div>

      {error && (
        <p style={{ color: '#ef4444', marginBottom: '16px' }}>{error}</p>
      )}

      {showCreateForm && (
        <CreateStaffForm onSuccess={handleCreateSuccess} onCancel={() => setShowCreateForm(false)} />
      )}

      <StaffTable staffUsers={staffUsers} />
    </div>
  );
}
