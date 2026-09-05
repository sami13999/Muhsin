'use client';

import React from 'react';
import { useToast } from '@/lib/toast';

interface Invoice {
  date: string;
  plan: string;
  price: string;
}

const MOCK_INVOICES: Invoice[] = [
  { date: 'Apr 2026', plan: 'Growth plan', price: '$498.00' },
  { date: 'Mar 2026', plan: 'Growth plan', price: '$498.00' },
  { date: 'Feb 2026', plan: 'Growth plan', price: '$498.00' },
  { date: 'Jan 2026', plan: 'Growth plan', price: '$249.00' }
];

export default function RecentInvoicesCard() {
  const toast = useToast();

  const handleDownload = (date: string) => {
    toast.success('Download Started', `Invoice PDF for ${date} is being downloaded.`);
  };

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, minWidth: 0, fontFamily: "'Inter', sans-serif" }}>
      <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Recent invoices</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {MOCK_INVOICES.map((inv, idx) => (
          <div 
            key={idx} 
            onClick={() => handleDownload(inv.date)}
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '12px 0', 
              borderBottom: idx === MOCK_INVOICES.length - 1 ? 'none' : '1px solid #f1f5f9',
              cursor: 'pointer',
              transition: 'background 0.15s ease'
            }}
          >
            <div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'block' }}>{inv.date}</span>
              <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginTop: '2px' }}>{inv.plan}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* Paid Status Pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ecfdf5', padding: '2px 8px', borderRadius: '9999px' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }} />
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#10b981' }}>Paid</span>
              </div>
              
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{inv.price}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
