'use client';

import React from 'react';

export default function LandingTestimonial() {
  return (
    <section style={{ padding: '100px 24px', background: '#0f172a', color: '#ffffff' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '64px', alignItems: 'center' }}>
        <div>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#1e293b', border: '2px solid #4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold' }}>
            FA
          </div>
          <div style={{ marginTop: '16px' }}>
            <h4 style={{ fontWeight: 600, fontSize: '16px' }}>Faisal Ahmed</h4>
            <p style={{ color: '#94a3b8', fontSize: '13px' }}>CEO, BrandX Pakistan</p>
          </div>
        </div>
        <div>
          <span style={{ fontSize: '48px', color: '#4f46e5', display: 'block', height: '24px', lineHeight: 1 }}>“</span>
          <p style={{ fontSize: '20px', fontWeight: 500, color: '#cbd5e1', lineHeight: 1.6, marginBottom: '24px' }}>
            MUSHIN completely transformed our regional marketing pipelines. We cut research time from days to minutes and achieved an 80% response rate on our Eid campaign. Having local PKR billing and JazzCash payment options was a lifesaver.
          </p>
          <div style={{ display: 'flex', gap: '32px' }}>
            <div>
              <span style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>3.2x</span>
              <span style={{ display: 'block', fontSize: '12px', color: '#94a3b8' }}>ROAS Growth</span>
            </div>
            <div>
              <span style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>80%</span>
              <span style={{ display: 'block', fontSize: '12px', color: '#94a3b8' }}>Outreach Open Rate</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
