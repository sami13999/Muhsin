'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/lib/toast';

const MOCK_AVATARS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
];

export default function ProfileSettings() {
  const toast = useToast();
  const [name, setName] = useState('Ayesha Malik');
  const [bio, setBio] = useState('Head of Growth · brand & creator partnerships in South Asia.');
  const [timezone, setTimezone] = useState('Asia/Karachi');
  const [language, setLanguage] = useState('English (Pakistan)');
  const [avatarUrl, setAvatarUrl] = useState(MOCK_AVATARS[0]);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('mushin_user_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.name) setName(parsed.name);
        if (parsed.bio !== undefined) setBio(parsed.bio);
        if (parsed.timezone) setTimezone(parsed.timezone);
        if (parsed.language) setLanguage(parsed.language);
        if (parsed.avatarUrl) setAvatarUrl(parsed.avatarUrl);
      } catch (err) {
        console.error(err);
      }
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const profile = { name, bio, timezone, language, avatarUrl };
    localStorage.setItem('mushin_user_profile', JSON.stringify(profile));
    window.dispatchEvent(new CustomEvent('mushin_profile_update', { detail: profile }));
    toast.success('Profile Saved', 'Your user parameters have been updated across the platform.');
  };

  const handleDiscard = () => {
    const saved = localStorage.getItem('mushin_user_profile');
    if (saved) {
      const parsed = JSON.parse(saved);
      setName(parsed.name || 'Ayesha Malik');
      setBio(parsed.bio || '');
      setTimezone(parsed.timezone || 'Asia/Karachi');
      setLanguage(parsed.language || 'English (Pakistan)');
      setAvatarUrl(parsed.avatarUrl || MOCK_AVATARS[0]);
    } else {
      setName('Ayesha Malik');
      setBio('Head of Growth · brand & creator partnerships in South Asia.');
      setTimezone('Asia/Karachi');
      setLanguage('English (Pakistan)');
      setAvatarUrl(MOCK_AVATARS[0]);
    }
    toast.info('Changes Discarded', 'Reverted profile settings to last saved version.');
  };

  return (
    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Profile</h3>
        <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>How you appear across your workspace.</p>
      </div>

      {/* Avatar Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '20px', position: 'relative' }}>
        <img src={avatarUrl} alt="avatar" style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }} />
        <div>
          <button
            type="button"
            onClick={() => setShowAvatarPicker(!showAvatarPicker)}
            style={{ background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Change avatar
          </button>
          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '6px' }}>PNG or JPG . 512×512 min.</div>
        </div>

        {showAvatarPicker && (
          <div style={{ position: 'absolute', top: '70px', left: 0, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 50, display: 'flex', gap: '8px' }}>
            {MOCK_AVATARS.map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt="avatar preset"
                onClick={() => {
                  setAvatarUrl(url);
                  setShowAvatarPicker(false);
                }}
                style={{ width: '38px', height: '38px', borderRadius: '50%', cursor: 'pointer', border: avatarUrl === url ? '2px solid #0f172a' : '2px solid transparent', objectFit: 'cover' }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Fields */}
      <div>
        <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#475569', marginBottom: '6px', letterSpacing: '0.05em' }}>FULL NAME</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#475569', marginBottom: '6px', letterSpacing: '0.05em' }}>EMAIL</label>
        <input type="email" value="you@mushin.pk" disabled style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#f8fafc', color: '#64748b' }} />
        <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', display: 'block' }}>Email changes are handled by support to prevent hijacking.</span>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#475569', marginBottom: '6px', letterSpacing: '0.05em' }}>BIO</label>
        <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none', fontFamily: 'inherit', lineHeight: 1.4 }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#475569', marginBottom: '6px', letterSpacing: '0.05em' }}>TIMEZONE</label>
          <select value={timezone} onChange={(e) => setTimezone(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#ffffff' }}>
            <option value="Asia/Karachi">Asia/Karachi (GMT+5)</option>
            <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
            <option value="Europe/London">Europe/London (GMT+0)</option>
            <option value="America/New_York">America/New_York (EST)</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#475569', marginBottom: '6px', letterSpacing: '0.05em' }}>LANGUAGE</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#ffffff' }}>
            <option value="English (Pakistan)">English (Pakistan)</option>
            <option value="Urdu (اردو)">Urdu (اردو)</option>
            <option value="English (US)">English (US)</option>
            <option value="Arabic (العربية)">Arabic (العربية)</option>
          </select>
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
        <button type="button" onClick={handleDiscard} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Discard
        </button>
        <button type="submit" style={{ background: '#0f172a', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 4px rgba(15,23,42,0.15)' }}>
          Save changes
        </button>
      </div>
    </form>
  );
}
