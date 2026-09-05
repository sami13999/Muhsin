'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/lib/toast';

export default function SecuritySettings() {
  const toast = useToast();
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [mfaApp, setMfaApp] = useState(true);
  const [mfaSms, setMfaSms] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('mushin_security_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.mfaApp !== undefined) setMfaApp(parsed.mfaApp);
        if (parsed.mfaSms !== undefined) setMfaSms(parsed.mfaSms);
      } catch (err) {
        console.error(err);
      }
    }
  }, []);

  const saveSecuritySettings = (app: boolean, sms: boolean) => {
    localStorage.setItem('mushin_security_settings', JSON.stringify({ mfaApp: app, mfaSms: sms, updatedAt: new Date().toISOString() }));
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPw) {
      toast.error('Missing Password', 'Please enter your current password.');
      return;
    }
    if (!newPw) {
      toast.error('Missing Password', 'Please enter your new password.');
      return;
    }
    if (newPw !== confirmPw) {
      toast.error('Password Mismatch', 'New password and confirmation do not match.');
      return;
    }
    
    localStorage.setItem('mushin_pw_updated', new Date().toISOString());
    toast.success('Password Updated', 'Your security credentials have been updated.');
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
  };

  const handleMfaAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setMfaApp(checked);
    saveSecuritySettings(checked, mfaSms);
    toast.success('MFA Updated', `Authenticator app MFA is now ${checked ? 'enabled' : 'disabled'}.`);
  };

  const handleMfaSmsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setMfaSms(checked);
    saveSecuritySettings(mfaApp, checked);
    toast.success('MFA Updated', `SMS MFA is now ${checked ? 'enabled' : 'disabled'}.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', fontFamily: "'Inter', sans-serif" }}>
      {/* Password Section */}
      <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '28px' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Password</h3>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>Update the password on your account.</p>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#475569', marginBottom: '6px', letterSpacing: '0.05em' }}>CURRENT PASSWORD</label>
          <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }} placeholder="••••••••" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#475569', marginBottom: '6px', letterSpacing: '0.05em' }}>NEW PASSWORD</label>
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }} placeholder="Min. 8 chars" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#475569', marginBottom: '6px', letterSpacing: '0.05em' }}>CONFIRM NEW PASSWORD</label>
            <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }} placeholder="Re-enter new password" />
          </div>
        </div>

        <button type="submit" style={{ alignSelf: 'flex-end', background: '#0f172a', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 4px rgba(15,23,42,0.15)' }}>
          Save changes
        </button>
      </form>

      {/* MFA Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Multi-factor authentication</h3>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>Add a second step when signing in.</p>
        </div>

        {/* Authenticator App */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', display: 'block' }}>Authenticator app</span>
            <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginTop: '3px' }}>Recommended — Google Authenticator, 1Password, Authy.</span>
          </div>
          <input type="checkbox" checked={mfaApp} onChange={handleMfaAppChange} style={{ cursor: 'pointer', width: '18px', height: '18px', accentColor: '#0f172a' }} />
        </div>

        {/* SMS */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', display: 'block' }}>SMS</span>
            <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginTop: '3px' }}>Send a code by SMS. Less secure than an authenticator app.</span>
          </div>
          <input type="checkbox" checked={mfaSms} onChange={handleMfaSmsChange} style={{ cursor: 'pointer', width: '18px', height: '18px', accentColor: '#0f172a' }} />
        </div>

        <button type="button" onClick={() => toast.success('Recovery codes generated', 'Check your downloads folder for recovery-codes.txt.')} style={{ alignSelf: 'flex-start', background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Download recovery codes
        </button>
      </div>
    </div>
  );
}
