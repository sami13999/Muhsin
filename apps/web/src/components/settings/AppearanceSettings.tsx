'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/lib/toast';

export default function AppearanceSettings() {
  const toast = useToast();
  const [theme, setTheme] = useState('Light');
  const [density, setDensity] = useState('Comfortable');
  const [animations, setAnimations] = useState(true);
  const [tooltips, setTooltips] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('mushin_appearance');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.theme) setTheme(parsed.theme);
        if (parsed.density) setDensity(parsed.density);
        if (parsed.animations !== undefined) setAnimations(parsed.animations);
        if (parsed.tooltips !== undefined) setTooltips(parsed.tooltips);
      } catch (e) {}
    }
  }, []);

  const saveAppearance = (t: string, d: string, anim: boolean, tool: boolean) => {
    const config = { theme: t, density: d, animations: anim, tooltips: tool };
    localStorage.setItem('mushin_appearance', JSON.stringify(config));
    
    // Apply dataset to document root
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = t.toLowerCase();
      document.documentElement.dataset.density = d.toLowerCase();
    }
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    saveAppearance(newTheme, density, animations, tooltips);
    toast.success('Theme Applied', `Switched theme to ${newTheme}.`);
  };

  const handleDensityChange = (newDensity: string) => {
    setDensity(newDensity);
    saveAppearance(theme, newDensity, animations, tooltips);
    toast.success('Layout Density', `Density set to ${newDensity}.`);
  };

  const handleAnimationsChange = (checked: boolean) => {
    setAnimations(checked);
    saveAppearance(theme, density, checked, tooltips);
    toast.success('Motion Preference', `Interface animations ${checked ? 'enabled' : 'disabled'}.`);
  };

  const handleTooltipsChange = (checked: boolean) => {
    setTooltips(checked);
    saveAppearance(theme, density, animations, checked);
    toast.success('Tooltips Preference', `Sidebar tooltips ${checked ? 'enabled' : 'disabled'}.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Appearance</h3>
        <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>Adjust how Mushin looks and feels across your session.</p>
      </div>

      {/* Theme Selector */}
      <div>
        <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#475569', marginBottom: '8px', letterSpacing: '0.05em' }}>THEME</label>
        <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', maxWidth: '280px' }}>
          {['Light', 'Dark', 'System'].map((t) => (
            <button key={t} type="button" onClick={() => handleThemeChange(t)} style={{ flex: 1, border: 'none', background: theme === t ? '#0f172a' : '#ffffff', color: theme === t ? '#ffffff' : '#64748b', padding: '8px 0', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Density Selector */}
      <div>
        <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#475569', marginBottom: '8px', letterSpacing: '0.05em' }}>DENSITY</label>
        <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', maxWidth: '200px' }}>
          {['Comfortable', 'Compact'].map((d) => (
            <button key={d} type="button" onClick={() => handleDensityChange(d)} style={{ flex: 1, border: 'none', background: density === d ? '#0f172a' : '#ffffff', color: density === d ? '#ffffff' : '#64748b', padding: '8px 0', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{d}</button>
          ))}
        </div>
      </div>

      {/* Interface animations */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
        <div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', display: 'block' }}>Interface animations</span>
          <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginTop: '3px' }}>Turn off to reduce motion across cards and transitions.</span>
        </div>
        <input type="checkbox" checked={animations} onChange={(e) => handleAnimationsChange(e.target.checked)} style={{ cursor: 'pointer', width: '18px', height: '18px', accentColor: '#0f172a' }} />
      </div>

      {/* Show sidebar tooltips */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', display: 'block' }}>Show sidebar tooltips</span>
          <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginTop: '3px' }}>Reveal item labels on hover when collapsed.</span>
        </div>
        <input type="checkbox" checked={tooltips} onChange={(e) => handleTooltipsChange(e.target.checked)} style={{ cursor: 'pointer', width: '18px', height: '18px', accentColor: '#0f172a' }} />
      </div>
    </div>
  );
}
