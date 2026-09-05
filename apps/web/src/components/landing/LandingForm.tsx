'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/toast';

export default function LandingForm({ initialType = 'trial' }: { initialType?: 'trial' | 'demo' }) {
  const { signup } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [formType, setFormType] = useState<'trial' | 'demo'>(initialType);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      if (formType === 'trial') {
        await signup(email, 'MUSHIN-TempPass123!', name);
        toast.success('Account created successfully!', 'Welcome to your 14-day free trial on MUSHIN.');
        router.push('/dashboard');
      } else {
        setTimeout(() => {
          setFormSuccess(true);
          setFormLoading(false);
          toast.info('Demo request submitted', 'Our strategy team will contact you on WhatsApp/Email within 4 hours.');
        }, 1200);
      }
    } catch (err: any) {
      toast.error('Onboarding failed', err.message || 'Something went wrong.');
      setFormLoading(false);
    }
  };

  return (
    <div className="auth-card" style={{ padding: '32px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.08)', background: '#ffffff' }}>
      <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px', marginBottom: '24px' }}>
        <button
          type="button"
          style={{ flex: 1, padding: '8px', background: formType === 'trial' ? '#ffffff' : 'transparent', color: formType === 'trial' ? '#0f172a' : '#64748b', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
          onClick={() => setFormType('trial')}
        >
          Start Free Trial
        </button>
        <button
          type="button"
          style={{ flex: 1, padding: '8px', background: formType === 'demo' ? '#ffffff' : 'transparent', color: formType === 'demo' ? '#0f172a' : '#64748b', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
          onClick={() => setFormType('demo')}
        >
          Book Strategic Demo
        </button>
      </div>

      {formSuccess ? (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '24px', fontWeight: 'bold' }}>
            ✓
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>Request Received</h3>
          <p style={{ fontSize: '14px', color: '#475569' }}>
            We have queued your demo slot. Faisal Ahmed from our support team will reach out shortly.
          </p>
        </div>
      ) : (
        <form onSubmit={handleOnboardingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>FULL NAME</label>
            <input
              type="text"
              required
              placeholder="Faisal Ahmed"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="premium-input"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>BUSINESS EMAIL</label>
            <input
              type="email"
              required
              placeholder="faisal@brandx.pk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="premium-input"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>WORKSPACE / COMPANY</label>
            <input
              type="text"
              required
              placeholder="BrandX Pakistan"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="premium-input"
            />
          </div>

          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
            <span>Included Credits: <strong>{formType === 'trial' ? '50 free events' : 'Full pilot program'}</strong></span>
            <span>Region: <strong>PK (JazzCash supported)</strong></span>
          </div>

          <button
            type="submit"
            disabled={formLoading}
            className="premium-btn indigo-gradient"
            style={{ width: '100%', padding: '12px', fontWeight: 600, fontSize: '15px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            {formLoading ? <span className="btn-spinner"></span> : formType === 'trial' ? 'Launch Workspace Trial' : 'Submit Demo Request'}
          </button>
        </form>
      )}
    </div>
  );
}
