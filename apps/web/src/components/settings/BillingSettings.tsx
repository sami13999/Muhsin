'use client';

import React, { useState } from 'react';
import { useToast } from '@/lib/toast';

export default function BillingSettings() {
  const toast = useToast();
  const [email, setEmail] = useState('finance@mushin.pk');
  const [legalName, setLegalName] = useState('MUSHIN Technologies (Pvt.) Ltd.');
  const [ntn, setNtn] = useState('1234567-8');
  const [strn, setStrn] = useState('1122334455');
  const [address, setAddress] = useState('Plot 42, Clifton Block 5, Karachi');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Billing Details Saved', 'Your corporate registry and tax billing parameters have been synced.');
  };

  return (
    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Billing preferences</h3>
        <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>How invoices, receipts, and tax details are handled.</p>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#475569', marginBottom: '6px', letterSpacing: '0.05em' }}>BILLING EMAIL</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#475569', marginBottom: '6px', letterSpacing: '0.05em' }}>COMPANY LEGAL NAME</label>
        <input type="text" value={legalName} onChange={(e) => setLegalName(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#475569', marginBottom: '6px', letterSpacing: '0.05em' }}>NTN</label>
          <input type="text" value={ntn} onChange={(e) => setNtn(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#475569', marginBottom: '6px', letterSpacing: '0.05em' }}>STRN</label>
          <input type="text" value={strn} onChange={(e) => setStrn(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#475569', marginBottom: '6px', letterSpacing: '0.05em' }}>BILLING ADDRESS</label>
        <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
        <button type="submit" style={{ background: '#0f172a', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/></svg>
          Save changes
        </button>
      </div>
    </form>
  );
}
