'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/lib/toast';

export default function NotificationsSettings() {
  const toast = useToast();
  const [notifs, setNotifs] = useState({
    search: true, campaign: true, security: true, billing: false, digest: false, marketing: false, inapp: true
  });

  useEffect(() => {
    const saved = localStorage.getItem('mushin_notification_settings');
    if (saved) {
      try {
        setNotifs(JSON.parse(saved));
      } catch (err) {
        console.error(err);
      }
    }
  }, []);

  const toggleNotif = (key: keyof typeof notifs) => {
    const updated = { ...notifs, [key]: !notifs[key] };
    setNotifs(updated);
    localStorage.setItem('mushin_notification_settings', JSON.stringify(updated));
    toast.success('Preference Saved', `Notification for "${key}" has been ${updated[key] ? 'enabled' : 'disabled'}.`);
  };

  const notificationOptions = [
    { key: 'search' as const, label: 'Email · search completion', desc: 'Sent when a search finishes running.' },
    { key: 'campaign' as const, label: 'Email · campaign updates', desc: 'Status changes, replies, and milestones.' },
    { key: 'security' as const, label: 'Email · security alerts', desc: 'Recommended — new devices, MFA changes.' },
    { key: 'billing' as const, label: 'Email · billing alerts', desc: 'Invoices, failed charges, plan changes.' },
    { key: 'digest' as const, label: 'Email · weekly digest', desc: 'A summary of workspace activity every Monday.' },
    { key: 'marketing' as const, label: 'Email · marketing', desc: 'Product updates, best practices, event invites.' },
    { key: 'inapp' as const, label: 'In-app · everything', desc: 'Show all notifications in the bell menu.' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Notifications</h3>
        <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>Choose how you want to be reached across your workspace.</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        {notificationOptions.map((opt, idx) => (
          <div key={opt.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#ffffff', borderBottom: idx === notificationOptions.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
            <div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', display: 'block' }}>{opt.label}</span>
              <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginTop: '3px' }}>{opt.desc}</span>
            </div>
            <input
              type="checkbox"
              checked={notifs[opt.key]}
              onChange={() => toggleNotif(opt.key)}
              style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#0f172a' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
