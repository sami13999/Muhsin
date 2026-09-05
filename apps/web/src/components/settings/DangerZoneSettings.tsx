'use client';

import React, { useState } from 'react';
import { useToast } from '@/lib/toast';

export default function DangerZoneSettings() {
  const toast = useToast();
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const handleExportData = () => {
    const data = {
      profile: localStorage.getItem('mushin_user_profile'),
      workspace: localStorage.getItem('mushin_workspace_settings'),
      lists: localStorage.getItem('mushin_crm_lists'),
      campaigns: localStorage.getItem('mushin_campaigns'),
      billing: localStorage.getItem('mushin_spend_caps'),
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mushin_workspace_export_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Export Complete', 'Full JSON archive of workspace data downloaded.');
  };

  const handleRemovePersonalData = () => {
    localStorage.removeItem('mushin_user_profile');
    toast.success('PII Anonymized', 'Personal profile details stripped. Default workspace identity restored.');
    window.dispatchEvent(new CustomEvent('mushin_profile_update', { detail: { name: 'Anonymous User', avatarUrl: '' } }));
    setConfirmAction(null);
  };

  const handleDeleteWorkspace = () => {
    localStorage.clear();
    toast.error('Workspace Deleted', 'All local workspace settings, shortlists and campaign data purged.');
    setConfirmAction(null);
    setTimeout(() => {
      window.location.href = '/login';
    }, 1500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626', margin: 0 }}>Danger zone</h3>
        <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>Permanent, irreversible actions live here. Handle with care.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Export Data */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', border: '1px solid #fee2e2', borderRadius: '12px', background: '#ffffff' }}>
          <div style={{ paddingRight: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'block' }}>Export all workspace data</span>
            <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '4px', lineHeight: 1.4 }}>Download a JSON archive with lists, campaigns, activity and settings.</span>
          </div>
          <button onClick={handleExportData} style={{ background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            Export data
          </button>
        </div>

        {/* Remove PII */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', border: '1px solid #fee2e2', borderRadius: '12px', background: '#ffffff' }}>
          <div style={{ paddingRight: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626', display: 'block' }}>Remove personal data</span>
            <span style={{ fontSize: '11px', color: '#f87171', display: 'block', marginTop: '4px', lineHeight: 1.4 }}>Strip PII (name, avatar) from historical events while keeping analytics intact.</span>
          </div>
          <button onClick={() => setConfirmAction('pii')} style={{ background: '#ffffff', color: '#dc2626', border: '1px solid #fee2e2', padding: '8px 16px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            Anonymize PII
          </button>
        </div>

        {/* Delete Workspace */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', border: '1px solid #fee2e2', borderRadius: '12px', background: '#ffffff' }}>
          <div style={{ paddingRight: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626', display: 'block' }}>Delete workspace</span>
            <span style={{ fontSize: '11px', color: '#f87171', display: 'block', marginTop: '4px', lineHeight: 1.4 }}>Permanently delete workspace data, lists, campaigns, and member privileges.</span>
          </div>
          <button onClick={() => setConfirmAction('delete_ws')} style={{ background: '#dc2626', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            Delete workspace
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }} onClick={() => setConfirmAction(null)}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', maxWidth: '420px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#dc2626', margin: '0 0 8px' }}>Are you absolutely sure?</h3>
            <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 20px', lineHeight: 1.5 }}>
              {confirmAction === 'pii'
                ? 'This action will anonymize your profile name and avatar across all activity logs.'
                : 'This action will permanently delete all workspace shortlists, campaigns, and local cache data. You will be redirected to the login page.'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setConfirmAction(null)} style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#475569', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                Cancel
              </button>
              <button
                onClick={confirmAction === 'pii' ? handleRemovePersonalData : handleDeleteWorkspace}
                style={{ background: '#dc2626', color: '#ffffff', border: 'none', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
