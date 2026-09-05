'use client';

import React, { useState } from 'react';
import ProfileSettings from '@/components/settings/ProfileSettings';
import SecuritySettings from '@/components/settings/SecuritySettings';
import SessionsSettings from '@/components/settings/SessionsSettings';
import WorkspaceSettings from '@/components/settings/WorkspaceSettings';
import MembersSettings from '@/components/settings/MembersSettings';
import BillingSettings from '@/components/settings/BillingSettings';
import IntegrationsSettings from '@/components/settings/IntegrationsSettings';
import PreferencesSettings from '@/components/settings/PreferencesSettings';

type SectionKey = 'profile' | 'security' | 'sessions' | 'notifications' | 'workspace' | 'members' | 'billing' | 'integrations' | 'appearance' | 'danger';

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SectionKey>('profile');

  const sections = [
    { key: 'profile', name: 'Profile', group: 'ACCOUNT' },
    { key: 'security', name: 'Security', group: 'ACCOUNT' },
    { key: 'sessions', name: 'Sessions', group: 'ACCOUNT' },
    { key: 'notifications', name: 'Notifications', group: 'ACCOUNT' },
    
    { key: 'workspace', name: 'Workspace', group: 'WORKSPACE' },
    { key: 'members', name: 'Members', group: 'WORKSPACE' },
    { key: 'billing', name: 'Billing', group: 'WORKSPACE' },
    { key: 'integrations', name: 'Integrations', group: 'WORKSPACE' },
    
    { key: 'appearance', name: 'Appearance', group: 'PREFERENCES' },
    { key: 'danger', name: 'Danger zone', group: 'PREFERENCES' },
  ] as const;

  return (
    <div className="settings-page-grid" style={{ fontFamily: "'Inter', sans-serif", maxWidth: '1000px', margin: '0 auto' }}>
      {/* Settings Navigation Sidebar */}
      <aside className="settings-nav-sidebar">
        <div style={{ marginBottom: '8px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Settings</h2>
          <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginTop: '4px' }}>Account, workspace and preferences.</span>
        </div>
        
        <div className="settings-nav-groups">
          {['ACCOUNT', 'WORKSPACE', 'PREFERENCES'].map((groupName) => (
            <div key={groupName} className="settings-nav-group">
              <span className="settings-group-title" style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '8px', letterSpacing: '0.05em' }}>{groupName}</span>
              <div className="settings-nav-buttons">
                {sections.filter(s => s.group === groupName).map((sect) => {
                  const isActive = activeSection === sect.key;
                  return (
                    <button key={sect.key} onClick={() => setActiveSection(sect.key)} className={`settings-tab-btn ${isActive ? 'active' : ''}`} style={{ textAlign: 'left', background: isActive ? '#0f172a' : 'transparent', color: isActive ? '#ffffff' : '#475569', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: isActive ? 600 : 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                      {sect.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Settings Content Container */}
      <div className="settings-content-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.01)', minWidth: 0 }}>
        {activeSection === 'profile' && <ProfileSettings />}
        {activeSection === 'security' && <SecuritySettings />}
        {activeSection === 'sessions' && <SessionsSettings />}
        {activeSection === 'notifications' && <PreferencesSettings activeSubTab="notifications" />}
        {activeSection === 'workspace' && <WorkspaceSettings />}
        {activeSection === 'members' && <MembersSettings />}
        {activeSection === 'billing' && <BillingSettings />}
        {activeSection === 'integrations' && <IntegrationsSettings />}
        {activeSection === 'appearance' && <PreferencesSettings activeSubTab="appearance" />}
        {activeSection === 'danger' && <PreferencesSettings activeSubTab="danger" />}
      </div>
    </div>
  );
}
