'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/lib/toast';

interface Member {
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Analyst' | 'Member';
  time: string;
  owner?: boolean;
}

interface Invite {
  email: string;
  role: 'Admin' | 'Analyst' | 'Member';
  time: string;
}

export default function MembersSettings() {
  const toast = useToast();
  const [members, setMembers] = useState<Member[]>([
    { name: 'Ayesha Malik', email: 'ayesha@mushin.pk', role: 'Owner', time: 'just now', owner: true },
    { name: 'Ahmed Raza Khan', email: 'ahmed@mushin.pk', role: 'Admin', time: '12m', owner: false },
    { name: 'Bilal Hussain', email: 'bilal@mushin.pk', role: 'Analyst', time: '1h', owner: false },
    { name: 'Sana Riaz', email: 'sana@mushin.pk', role: 'Analyst', time: '3d', owner: false }
  ]);

  const [invites, setInvites] = useState<Invite[]>([
    { email: 'faisal@brandx.pk', role: 'Analyst', time: 'sent 2d ago' }
  ]);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'Admin' | 'Analyst' | 'Member'>('Analyst');

  useEffect(() => {
    const savedMembers = localStorage.getItem('mushin_members');
    if (savedMembers) {
      try {
        setMembers(JSON.parse(savedMembers));
      } catch (e) {}
    }
    const savedInvites = localStorage.getItem('mushin_invites');
    if (savedInvites) {
      try {
        setInvites(JSON.parse(savedInvites));
      } catch (e) {}
    }
  }, []);

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      toast.error('Email Required', 'Please enter a valid teammate email address.');
      return;
    }

    const newInvite: Invite = {
      email: inviteEmail.trim(),
      role: inviteRole,
      time: 'sent just now'
    };

    const updated = [newInvite, ...invites];
    setInvites(updated);
    localStorage.setItem('mushin_invites', JSON.stringify(updated));
    toast.success('Invitation Sent', `Invitation email sent to ${inviteEmail} (${inviteRole}).`);

    setInviteEmail('');
    setInviteRole('Analyst');
    setShowInviteModal(false);
  };

  const handleRevokeInvite = (email: string) => {
    const updated = invites.filter(i => i.email !== email);
    setInvites(updated);
    localStorage.setItem('mushin_invites', JSON.stringify(updated));
    toast.success('Invitation Revoked', `Invite for ${email} cancelled.`);
  };

  const handleRemoveMember = (email: string) => {
    const updated = members.filter(m => m.email !== email);
    setMembers(updated);
    localStorage.setItem('mushin_members', JSON.stringify(updated));
    toast.success('Member Removed', `Teammate ${email} removed from workspace.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      {/* Active Members Card */}
      <div style={{ padding: '24px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Members</h3>
            <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginTop: '3px' }}>{members.length} members in this workspace.</span>
          </div>
          <button onClick={() => setShowInviteModal(true)} style={{ background: '#0f172a', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 4px rgba(15,23,42,0.15)' }}>
            + Invite member
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {members.map((mem) => (
            <div key={mem.email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: '#f1f5f9', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                  {mem.name.charAt(0)}
                </div>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', display: 'block' }}>{mem.name}</span>
                  <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginTop: '2px' }}>{mem.email}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '10px', background: mem.owner ? '#eff6ff' : '#f1f5f9', color: mem.owner ? '#1d4ed8' : '#475569', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>{mem.role}</span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>{mem.time}</span>
                <button
                  disabled={mem.owner}
                  onClick={() => handleRemoveMember(mem.email)}
                  style={{ background: 'transparent', border: 'none', color: mem.owner ? '#cbd5e1' : '#ef4444', cursor: mem.owner ? 'default' : 'pointer', fontSize: '14px', padding: '4px' }}
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invitations Card */}
      {invites.length > 0 && (
        <div style={{ padding: '24px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Pending invitations</h3>
            <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginTop: '3px' }}>Invites sent that haven't been accepted yet.</span>
          </div>
          {invites.map((inv) => (
            <div key={inv.email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', display: 'block' }}>{inv.email}</span>
                <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginTop: '2px' }}>Role: {inv.role} . {inv.time}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => toast.success('Invite Resent', `Resent invite to ${inv.email}`)} style={{ background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Resend
                </button>
                <button onClick={() => handleRevokeInvite(inv.email)} style={{ background: '#ffffff', color: '#dc2626', border: '1px solid #fee2e2', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Revoke
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }} onClick={() => setShowInviteModal(false)}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', maxWidth: '440px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Invite Team Member</h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px' }}>Send an invitation email to grant workspace access.</p>
            <form onSubmit={handleSendInvite} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>TEAMMATE EMAIL</label>
                <input type="email" placeholder="colleague@company.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>ROLE PERMISSION</label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as any)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#ffffff' }}>
                  <option value="Admin">Admin (Full access & billing)</option>
                  <option value="Analyst">Analyst (Creator search & campaign management)</option>
                  <option value="Member">Member (View shortlists & metrics only)</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowInviteModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#64748b' }}>Cancel</button>
                <button type="submit" style={{ background: '#0f172a', color: '#ffffff', border: 'none', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Send Invite</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
