'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/lib/toast';
import { api } from '@/lib/api';

export default function WorkspaceSettings() {
  const toast = useToast();
  const [name, setName] = useState('MUSHIN Workspace');
  const [slug, setSlug] = useState('mushin-workspace');
  const [currency, setCurrency] = useState('PKR');
  const [region, setRegion] = useState('Pakistan');

  useEffect(() => {
    let mounted = true;

    async function loadWorkspace() {
      try {
        const res = await api.listWorkspaces();
        if (mounted && res?.data?.[0]?.workspace) {
          const ws = res.data[0].workspace;
          setName(ws.name || 'MUSHIN Workspace');
          setSlug(ws.slug || 'mushin-workspace');
          return;
        }
      } catch {
        // Fallback to local storage if API is offline
      }

      if (mounted) {
        const saved = localStorage.getItem('mushin_workspace_settings');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.name) setName(parsed.name);
            if (parsed.slug) setSlug(parsed.slug);
            if (parsed.currency) setCurrency(parsed.currency);
            if (parsed.region) setRegion(parsed.region);
          } catch (err) {
            console.error(err);
          }
        }
      }
    }

    loadWorkspace();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const ws = { name, slug, currency, region };
    localStorage.setItem('mushin_workspace_settings', JSON.stringify(ws));
    window.dispatchEvent(new CustomEvent('mushin_workspace_update', { detail: ws }));
    toast.success('Workspace Saved', `Updated settings for "${name}".`);
  };

  return (
    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Workspace</h3>
        <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>Configure the workspace shared with your team.</p>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#475569', marginBottom: '6px', letterSpacing: '0.05em' }}>WORKSPACE NAME</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#475569', marginBottom: '6px', letterSpacing: '0.05em' }}>SLUG</label>
        <input type="text" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
        <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', display: 'block' }}>Used in shared links: mushin.io/w/{slug}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#475569', marginBottom: '6px', letterSpacing: '0.05em' }}>DEFAULT CURRENCY</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#ffffff' }}>
            <option value="PKR">PKR (Rs.)</option>
            <option value="USD">USD ($)</option>
            <option value="AED">AED (د.إ)</option>
            <option value="GBP">GBP (£)</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#475569', marginBottom: '6px', letterSpacing: '0.05em' }}>REGION</label>
          <input type="text" value={region} onChange={(e) => setRegion(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
        </div>
      </div>

      {/* Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
        <button type="submit" style={{ background: '#0f172a', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 4px rgba(15,23,42,0.15)' }}>
          Save changes
        </button>
      </div>
    </form>
  );
}
