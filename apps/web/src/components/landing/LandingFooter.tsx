'use client';

import React from 'react';
import Link from 'next/link';
import { footerColumns, footerBadges } from './LandingFooterLinks';

export default function LandingFooter() {
  return (
    <footer style={{ background: '#ffffff', borderTop: '1px solid #e2e8f0', padding: '64px 24px 32px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Top Grid - Designed to keep all columns side-by-side on desktop */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr repeat(4, 1fr)',
            gap: '32px',
            marginBottom: '64px',
            alignItems: 'start',
          }}
          className="footer-grid-responsive"
        >
          
          {/* Logo description block */}
          <div style={{ minWidth: '200px', paddingRight: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <img src="/logo.png" alt="MUSHIN Logo" style={{ height: '45px', width: 'auto', display: 'block' }} />
              <span style={{ color: 'rgb(15, 23, 42)', fontWeight: 700, letterSpacing: '0.14em', fontSize: '0.875rem', lineHeight: 1, transform: 'translateY(1px)' }}>
                MUSHIN
              </span>
            </div>
            
            <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.6, marginBottom: '20px', maxWidth: '240px' }}>
              The intelligence platform for modern revenue teams. Built for scale, designed for trust.
            </p>

            <div style={{ display: 'flex', gap: '6px' }}>
              {footerBadges.map(b => (
                <span key={b} style={{ fontSize: '9px', fontWeight: 600, color: '#94a3b8', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '4px' }}>
                  {b}
                </span>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          {footerColumns.map((col, idx) => (
            <div key={idx} style={{ minWidth: '110px' }}>
              <h5 style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', marginBottom: '16px' }}>
                {col.title}
              </h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                {col.links.map((link, lidx) => (
                  <a key={lidx} href="#" style={{ color: '#64748b', textDecoration: 'none' }}>
                    {link}
                  </a>
                ))}
              </div>
            </div>
          ))}

        </div>

        {/* Bottom copyright row */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', fontSize: '11px', color: '#94a3b8' }}>
          <span>© 2026 Mushin Technologies, Inc. All rights reserved.</span>
          <div style={{ display: 'flex', gap: '16px' }}>
            <a href="#" style={{ color: '#94a3b8', textDecoration: 'none' }}>Privacy</a>
            <a href="#" style={{ color: '#94a3b8', textDecoration: 'none' }}>Terms</a>
            <a href="#" style={{ color: '#94a3b8', textDecoration: 'none' }}>Security</a>
            <a href="#" style={{ color: '#94a3b8', textDecoration: 'none' }}>DPA</a>
            <Link href="/admin/login" style={{ color: '#94a3b8', textDecoration: 'none' }}>Staff</Link>
          </div>
        </div>

        {/* Inline CSS fallback for responsive grid layout on mobile screens */}
        <style jsx global>{`
          @media (max-width: 768px) {
            .footer-grid-responsive {
              grid-template-columns: 1fr 1fr !important;
            }
          }
          @media (max-width: 480px) {
            .footer-grid-responsive {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>

      </div>
    </footer>
  );
}
