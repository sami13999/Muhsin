'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/toast';

export default function AdminLoginForm() {
  const router = useRouter();
  const toast = useToast();

  const [role, setRole] = useState<'admin' | 'support'>('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      const staffName = role === 'admin' ? 'Faisal Ahmed' : 'Mira Solis';
      const staffSession = {
        name: staffName,
        role: role,
        email: email || `${role}@mushin.io`,
      };

      localStorage.setItem('mushin_staff_session', JSON.stringify(staffSession));
      toast.success('Access granted', `Welcome to Staff Control, ${staffName}.`);
      router.push('/admin');
    }, 1200);
  };

  return (
    <div className="auth-card" style={{ width: '100%', maxWidth: '400px', padding: '40px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <span style={{ fontSize: '11px', background: '#fee2e2', color: '#ef4444', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>MFA REQUIRED 🔒</span>
      </div>

      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', marginBottom: '20px', margin: 0 }}>Staff Access</h2>

      <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px', marginBottom: '24px', marginTop: '16px' }}>
        <button
          type="button"
          onClick={() => setRole('admin')}
          style={{ flex: 1, padding: '6px', background: role === 'admin' ? '#ffffff' : 'transparent', color: role === 'admin' ? '#0f172a' : '#64748b', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
        >
          Administrator
        </button>
        <button
          type="button"
          onClick={() => setRole('support')}
          style={{ flex: 1, padding: '6px', background: role === 'support' ? '#ffffff' : 'transparent', color: role === 'support' ? '#0f172a' : '#64748b', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
        >
          Support Agent
        </button>
      </div>

      <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>STAFF EMAIL</label>
          <input
            type="email"
            required
            className="premium-input"
            placeholder={role === 'admin' ? 'faisal.ahmed@mushin.io' : 'mira.solis@mushin.io'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>PASSWORD</label>
          <input
            type="password"
            required
            className="premium-input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>AUTHENTICATOR CODE (MFA)</label>
          <input
            type="text"
            required
            maxLength={6}
            className="premium-input"
            placeholder="000 000"
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="premium-btn primary"
          style={{ width: '100%', padding: '12px', fontSize: '14px', marginTop: '12px', background: '#0f172a', border: 'none', borderRadius: '6px', color: '#ffffff', cursor: 'pointer' }}
        >
          {loading ? <span className="btn-spinner"></span> : `Verify & Sign In`}
        </button>
      </form>
    </div>
  );
}
