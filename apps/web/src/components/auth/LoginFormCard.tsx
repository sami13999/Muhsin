'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/lib/toast';

export default function LoginFormCard() {
  const { login } = useAuth();
  const router = useRouter();
  const toast = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [staggerVisible, setStaggerVisible] = useState<boolean[]>([]);

  useEffect(() => {
    const items = [0, 1, 2, 3];
    items.forEach((index) => {
      setTimeout(() => {
        setStaggerVisible((prev) => {
          const next = [...prev];
          next[index] = true;
          return next;
        });
      }, index * 70);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Successfully signed in', 'Welcome back to MUSHIN!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error('Sign in failed', err.message || 'Check your credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-card" style={{ width: '100%', maxWidth: '440px', padding: '40px', zIndex: 5 }}>
      {/* Header (stagger 0) */}
      <div style={{ transitionDelay: '0ms' }} className={`stagger-item ${staggerVisible[0] ? 'visible' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <img src="/logo.png" alt="MUSHIN Logo" style={{ width: '55px', height: '55px', objectFit: 'contain', display: 'block' }} />
          <span style={{ color: 'rgb(15, 23, 42)', fontWeight: 700, letterSpacing: '0.14em', fontSize: '0.875rem', lineHeight: 1, transform: 'translateY(1px)' }}>
            MUSHIN
          </span>
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Welcome back</h1>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '32px' }}>Enter your credentials to access your workspace</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Email input (stagger 1) */}
        <div style={{ transitionDelay: '70ms' }} className={`stagger-item ${staggerVisible[1] ? 'visible' : ''}`}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
            BUSINESS EMAIL
          </label>
          <input
            type="email"
            className="premium-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            disabled={loading}
          />
        </div>

        {/* Password input (stagger 2) */}
        <div style={{ transitionDelay: '140ms' }} className={`stagger-item ${staggerVisible[2] ? 'visible' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>PASSWORD</label>
            <Link href="/forgot-password" style={{ fontSize: '12px', color: '#4f46e5', fontWeight: 500 }}>
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            className="premium-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            disabled={loading}
          />
        </div>

        {/* Submit button (stagger 3) */}
        <div style={{ transitionDelay: '210ms', marginTop: '8px' }} className={`stagger-item ${staggerVisible[3] ? 'visible' : ''}`}>
          <button
            type="submit"
            className="premium-btn indigo-gradient"
            disabled={loading}
            style={{ width: '100%', padding: '12px', fontWeight: 600, fontSize: '15px' }}
          >
            {loading ? <span className="btn-spinner"></span> : 'Sign In'}
          </button>
          <p style={{ textAlign: 'center', fontSize: '14px', color: '#64748b', marginTop: '24px' }}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" style={{ color: '#4f46e5', fontWeight: 600 }}>
              Start free trial
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
