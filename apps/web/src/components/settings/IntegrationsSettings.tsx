'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/lib/toast';

interface Integration {
  id: string;
  name: string;
  desc: string;
  connected: boolean;
  apiKey?: string;
}

export default function IntegrationsSettings() {
  const toast = useToast();
  const [integrations, setIntegrations] = useState<Integration[]>([
    { id: 'hubspot', name: 'HubSpot', desc: 'Sync creators, campaigns and deals to your CRM.', connected: true, apiKey: 'pat-na1-89304-xxxx' },
    { id: 'slack', name: 'Slack', desc: 'Get campaign and search alerts in Slack channels.', connected: true, apiKey: 'xoxb-89123-xxxx' },
    { id: 'discord', name: 'Discord', desc: 'Push activity events to your workspace Discord.', connected: false },
    { id: 'zapier', name: 'Zapier', desc: 'Wire Mushin events into 6,000+ apps.', connected: false },
    { id: 'webhooks', name: 'Webhooks', desc: 'Send raw event payloads to your endpoint.', connected: false }
  ]);

  const [activeConfigId, setActiveConfigId] = useState<string | null>(null);
  const [configKey, setConfigKey] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('mushin_integrations');
    if (saved) {
      try {
        setIntegrations(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const handleToggle = (id: string, name: string, isConnected: boolean) => {
    if (!isConnected) {
      // Open config modal to set API key/webhook URL
      const target = integrations.find(i => i.id === id);
      setConfigKey(target?.apiKey || '');
      setActiveConfigId(id);
    } else {
      const updated = integrations.map(item => item.id === id ? { ...item, connected: false, apiKey: undefined } : item);
      setIntegrations(updated);
      localStorage.setItem('mushin_integrations', JSON.stringify(updated));
      toast.info('Integration Disconnected', `${name} auth token has been revoked.`);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConfigId) return;

    const target = integrations.find(i => i.id === activeConfigId);
    const updated = integrations.map(item => item.id === activeConfigId ? { ...item, connected: true, apiKey: configKey.trim() || 'active_token' } : item);
    setIntegrations(updated);
    localStorage.setItem('mushin_integrations', JSON.stringify(updated));
    toast.success('Integration Connected', `Successfully authenticated and connected ${target?.name}.`);
    
    setActiveConfigId(null);
    setConfigKey('');
  };

  const activeTarget = integrations.find(i => i.id === activeConfigId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Integrations</h3>
        <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>Connect your workflow tools and sync marketing activity events.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {integrations.map((item) => (
          <div 
            key={item.id} 
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '16px 20px', 
              background: '#ffffff', 
              border: '1px solid #e2e8f0', 
              borderRadius: '12px' 
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{item.name}</span>
                {item.connected && (
                  <span style={{ fontSize: '9px', fontWeight: 700, color: '#10b981', background: '#ecfdf5', padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#10b981' }} />
                    Connected
                  </span>
                )}
              </div>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0', lineHeight: 1.4 }}>{item.desc}</p>
            </div>
            
            <button 
              onClick={() => handleToggle(item.id, item.name, item.connected)} 
              style={{ 
                background: item.connected ? '#ffffff' : '#0f172a', 
                color: item.connected ? '#0f172a' : '#ffffff', 
                border: item.connected ? '1px solid #cbd5e1' : 'none', 
                padding: '8px 16px', 
                borderRadius: '8px', 
                fontSize: '11px', 
                fontWeight: 600, 
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease'
              }}
            >
              {item.connected ? 'Disconnect' : 'Connect'}
            </button>
          </div>
        ))}
      </div>

      {/* Integration Config Modal */}
      {activeConfigId && activeTarget && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }} onClick={() => setActiveConfigId(null)}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', maxWidth: '440px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Connect {activeTarget.name}</h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px' }}>Provide your API key or endpoint secret to enable event synchronization.</p>
            <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>API KEY / WEBHOOK URL</label>
                <input type="text" placeholder="e.g. https://hooks.slack.com/services/..." value={configKey} onChange={(e) => setConfigKey(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setActiveConfigId(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#64748b' }}>Cancel</button>
                <button type="submit" style={{ background: '#0f172a', color: '#ffffff', border: 'none', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Authorize & Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
