'use client';

import React from 'react';

export default function LandingBrands() {
  const brands = ['Khaadi', 'Daraz', 'BrandX', 'Foodpanda', 'Outfitter'];

  return (
    <section style={{ padding: '40px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
        <p style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '24px', margin: 0 }}>
          TRUSTED BY LEADING PAKISTANI & GLOBAL BRANDS
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '32px', opacity: 0.65, marginTop: '24px' }}>
          {brands.map(brand => (
            <span key={brand} style={{ fontSize: '18px', fontWeight: 700, color: '#475569' }}>{brand}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
