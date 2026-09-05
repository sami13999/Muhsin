'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/lib/toast';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';

const STRENGTHS = [
  { label: 'Too Weak', color: '#ef4444' },
  { label: 'Weak', color: '#f59e0b' },
  { label: 'Moderate', color: '#3b82f6' },
  { label: 'Strong', color: '#10b981' }
];

export default function SignupFormCard() {
  const { signup } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [staggerVisible, setStaggerVisible] = useState<boolean[]>([]);
  const [strength, setStrength] = useState(0);

  useEffect(() => {
    [0, 1, 2, 3, 4, 5].forEach((i) => {
      setTimeout(() => {
        setStaggerVisible((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, i * 70);
    });
  }, []);

  const evaluatePassword = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score++;
    setStrength(score);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signup(email, password, name);
      toast.success('Account created successfully!', 'Welcome to MUSHIN.');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error('Signup failed', err.message || 'Check details and try again.');
      setLoading(false);
    }
  };

  const strengthConfig = STRENGTHS[strength] || STRENGTHS[0];

  return (
    <div className="auth-card" style={{ width: '100%', maxWidth: '440px', padding: '40px', zIndex: 5 }}>
      {/* Header */}
      <div style={{ transitionDelay: '0ms' }} className={`stagger-item ${staggerVisible[0] ? 'visible' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <img src="/logo.png" alt="MUSHIN Logo" style={{ width: '55px', height: '55px', objectFit: 'contain', display: 'block' }} />
          <span style={{ color: 'rgb(15, 23, 42)', fontWeight: 700, letterSpacing: '0.14em', fontSize: '0.875rem', lineHeight: 1, transform: 'translateY(1px)' }}>
            MUSHIN
          </span>
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Create your account</h1>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '32px' }}>Start your 14-day free trial on MUSHIN</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ transitionDelay: '70ms' }} className={`stagger-item ${staggerVisible[1] ? 'visible' : ''}`}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>FULL NAME</label>
          <input type="text" className="premium-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Faisal Ahmed" required disabled={loading} />
        </div>

        <div style={{ transitionDelay: '140ms' }} className={`stagger-item ${staggerVisible[2] ? 'visible' : ''}`}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>BUSINESS EMAIL</label>
          <input type="email" className="premium-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.pk" required disabled={loading} />
        </div>

        <div style={{ transitionDelay: '210ms' }} className={`stagger-item ${staggerVisible[3] ? 'visible' : ''}`}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>PASSWORD</label>
          <input type="password" className="premium-input" value={password} onChange={(e) => { setPassword(e.target.value); evaluatePassword(e.target.value); }} placeholder="••••••••" required disabled={loading} />
        </div>

        {password.length > 0 && (
          <PasswordStrengthIndicator strength={strength} label={strengthConfig.label} color={strengthConfig.color} visible={staggerVisible[4]} />
        )}

        <div style={{ transitionDelay: '350ms', marginTop: '12px' }} className={`stagger-item ${staggerVisible[5] ? 'visible' : ''}`}>
          <button type="submit" className="premium-btn indigo-gradient" disabled={loading} style={{ width: '100%', padding: '12px', fontWeight: 600, fontSize: '15px' }}>
            {loading ? <span className="btn-spinner"></span> : 'Get Started'}
          </button>
          <p style={{ textAlign: 'center', fontSize: '14px', color: '#64748b', marginTop: '24px' }}>
            Already have an account? <Link href="/login" style={{ color: '#4f46e5', fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </form>
    </div>
  );
}
