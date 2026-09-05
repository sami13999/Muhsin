'use client';

import React from 'react';

interface StaffUser {
  staffUserId: string;
  displayName: string;
  email: string;
  role: 'admin' | 'support';
  department: string | null;
  createdAt: string;
}

interface StaffTableProps {
  staffUsers: StaffUser[];
}

export default function StaffTable({ staffUsers }: StaffTableProps) {
  return (
    <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>Name</th>
            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>Email</th>
            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>Role</th>
            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>Department</th>
            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>Created</th>
          </tr>
        </thead>
        <tbody>
          {staffUsers.map((user) => (
            <tr key={user.staffUserId} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '12px 16px', fontSize: '14px' }}>{user.displayName}</td>
              <td style={{ padding: '12px 16px', fontSize: '14px', color: '#64748b' }}>{user.email}</td>
              <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  background: user.role === 'admin' ? '#fef3c7' : '#dbeafe',
                  color: user.role === 'admin' ? '#92400e' : '#1e40af',
                }}>
                  {user.role}
                </span>
              </td>
              <td style={{ padding: '12px 16px', fontSize: '14px', color: '#64748b' }}>{user.department ?? '—'}</td>
              <td style={{ padding: '12px 16px', fontSize: '14px', color: '#64748b' }}>
                {new Date(user.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
