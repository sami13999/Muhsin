'use client';

import React, { useState } from 'react';
import { useToast } from '@/lib/toast';

export default function SessionsSettings() {
  const toast = useToast();
  const [sessions, setSessions] = useState([
    { id: '1', device: 'MacBook Pro . Safari', location: 'Karachi . 39.34.***.18', time: 'Just now', current: true },
    { id: '2', device: 'iPhone 15 Pro . Safari', location: 'Karachi . 39.34.***.18', time: '3h', current: false },
    { id: '3', device: 'Windows . Chrome', location: 'Lahore . 103.240.***.9', time: 'Yesterday', current: false }
  ]);

  const handleRevoke = (id: string, device: string) => {
    setSessions(sessions.filter(s => s.id !== id));
    toast.success('Session Revoked', `Token for ${device} terminated.`);
  };

  const handleSignOutAll = () => {
    setSessions(sessions.filter(s => s.current));
    toast.success('Sessions Cleared', 'All other devices signed out.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Active sessions</h3>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>Every device signed in to your Mushin account.</p>
        </div>
        <button onClick={handleSignOutAll} style={{ background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Sign out all others
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        {sessions.map((sess, idx) => (
          <div key={sess.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#ffffff', borderBottom: idx === sessions.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{sess.device}</span>
                {sess.current && (
                  <span style={{ fontSize: '9px', fontWeight: 700, color: '#10b981', background: '#ecfdf5', padding: '2px 6px', borderRadius: '4px' }}>This device</span>
                )}
              </div>
              <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginTop: '3px' }}>
                {sess.location} . {sess.time}
              </span>
            </div>
            
            {!sess.current && (
              <button onClick={() => handleRevoke(sess.id, sess.device)} style={{ background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Revoke
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
