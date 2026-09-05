'use client';

import React, { useState } from 'react';
import { useToast } from '@/lib/toast';
import { useConfirm } from '@/lib/toast';

interface AdminUsersProps {
  onImpersonate: (email: string) => void;
}

export default function AdminUsers({ onImpersonate }: AdminUsersProps) {
  const toast = useToast();
  const confirm = useConfirm();

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const users = [
    { id: 'usr-1', name: 'Faisal Ahmed', email: 'faisal@brandx.pk', ws: 'BrandX Pakistan', date: 'Jul 01, 2026' },
    { id: 'usr-2', name: 'Mira Solis', email: 'mira@brandx.pk', ws: 'BrandX Pakistan', date: 'Jul 12, 2026' },
  ];

  const handleSuspendUser = async (userId: string, name: string) => {
    const confirmed = await confirm({
      title: 'Suspend Workspace User?',
      description: `This will suspend "${name}" and revoke all active login sessions and billing authorizations immediately.`,
      confirmText: 'Suspend Account',
      isDestructive: true,
    });

    if (confirmed) {
      toast.success('Account Suspended', `${name} has been set to suspended.`);
      setIsDrawerOpen(false);
    }
  };

  const activeUser = users.find(u => u.id === selectedUserId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Workspace Users</h2>
      
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left', color: '#cbd5e1' }}>
          <thead>
            <tr style={{ background: '#334155', borderBottom: '1px solid #475569', color: '#f1f5f9' }}>
              <th style={{ padding: '16px' }}>Name</th>
              <th style={{ padding: '16px' }}>Email</th>
              <th style={{ padding: '16px' }}>Workspace</th>
              <th style={{ padding: '16px' }}>Registration</th>
              <th style={{ padding: '16px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '16px', fontWeight: 600, color: '#f1f5f9' }}>{user.name}</td>
                <td style={{ padding: '16px' }}>{user.email}</td>
                <td style={{ padding: '16px' }}>{user.ws}</td>
                <td style={{ padding: '16px' }}>{user.date}</td>
                <td style={{ padding: '16px', display: 'flex', gap: '12px' }}>
                  <button onClick={() => onImpersonate(user.email)} style={{ background: '#3b82f6', border: 'none', color: '#ffffff', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                    Impersonate 👤
                  </button>
                  <button onClick={() => { setSelectedUserId(user.id); setIsDrawerOpen(true); }} style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: '12px' }}>
                    View details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isDrawerOpen && activeUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', justifyContent: 'flex-end' }} onClick={() => setIsDrawerOpen(false)}>
          <div style={{ width: '360px', height: '100vh', background: '#1e293b', borderLeft: '1px solid #334155', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#f1f5f9', margin: 0 }}>User Details</h3>
              <button onClick={() => setIsDrawerOpen(false)} style={{ background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>
            <div>
              <strong style={{ fontSize: '14px', display: 'block', color: '#f1f5f9' }}>{activeUser.name}</strong>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>{activeUser.email}</span>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>BILLING SUMMARY</span>
              <div style={{ background: '#0f172a', padding: '12px', borderRadius: '6px', fontSize: '12px' }}>
                <div>Credit balance: <strong>14</strong></div>
                <div style={{ marginTop: '4px' }}>Invoices due: <strong>Rs. 12,900</strong></div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' }}>
              <button onClick={() => handleSuspendUser(activeUser.id, activeUser.name)} className="premium-btn" style={{ background: '#ef4444', color: '#ffffff', border: '1px solid #ef4444', fontSize: '13px', cursor: 'pointer', borderRadius: '6px', padding: '8px' }}>
                Suspend Account
              </button>
              <button onClick={() => { toast.success('Password Reset Sent', 'A secure reset link has been dispatched.'); setIsDrawerOpen(false); }} className="premium-btn secondary" style={{ fontSize: '13px', background: 'transparent', color: '#cbd5e1', borderColor: '#475569', cursor: 'pointer', borderRadius: '6px', padding: '8px' }}>
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
