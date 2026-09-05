'use client';

import React, { useState } from 'react';
import { useToast } from '@/lib/toast';

interface SpendCapsCardProps {
  monthly: number;
  daily: number;
  workflow: number;
  onSave: (values: { monthly: number; daily: number; workflow: number }) => void;
}

export default function SpendCapsCard({ monthly, daily, workflow, onSave }: SpendCapsCardProps) {
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [mInput, setMInput] = useState(String(monthly));
  const [dInput, setDInput] = useState(String(daily));
  const [wInput, setWInput] = useState(String(workflow));

  const handleSave = () => {
    onSave({
      monthly: Number(mInput) || 5000,
      daily: Number(dInput) || 250,
      workflow: Number(wInput) || 50
    });
    setIsEditing(false);
    toast.success('Spend Caps Saved', 'Your spend caps have been updated successfully.');
  };

  const showWarning = Number(wInput) <= 60 || Number(mInput) <= 6000;

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, minWidth: 0, fontFamily: "'Inter', sans-serif" }}>
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Spend caps</h3>
        <button onClick={isEditing ? handleSave : () => setIsEditing(true)} style={{ background: 'transparent', border: 'none', color: '#4f46e5', fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
          {isEditing ? 'Save' : 'Edit'}
        </button>
      </div>

      {/* Caps Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {[
          { label: 'Monthly hard cap', val: monthly, state: mInput, set: setMInput, limit: 5000, unit: '', pct: 75, color: '#10b981' },
          { label: 'Daily soft cap', val: daily, state: dInput, set: setDInput, limit: 250, unit: '', pct: 40, color: '#10b981' },
          { label: 'Workflow-level cap', val: workflow, state: wInput, set: setWInput, limit: 50, unit: ' / run', pct: 85, color: '#f97316' }
        ].map((row, idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
              <span style={{ color: '#475569', fontWeight: 500 }}>{row.label}</span>
              {isEditing ? (
                <input type="number" value={row.state} onChange={(e) => row.set(e.target.value)} style={{ width: '80px', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', textAlign: 'right' }} />
              ) : (
                <strong style={{ color: '#0f172a' }}>${row.val.toLocaleString()}{row.unit}</strong>
              )}
            </div>
            <div style={{ background: '#f1f5f9', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${row.pct}%`, background: row.color, height: '100%', borderRadius: '3px' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Warning Banner */}
      {showWarning && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: '#fffbeb', border: '1px solid #fef08a', borderRadius: '8px', fontSize: '11px', color: '#b45309', fontWeight: 500, lineHeight: 1.4 }}>
          <span>⚠️</span>
          <span>One cap is approaching its threshold. Review before end of cycle.</span>
        </div>
      )}
    </div>
  );
}
