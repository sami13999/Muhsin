/**
 * MUSHIN 2.0 Forgot Password Page
 * Aurora backdrop and card entrance, staggered inputs, and spring-in mail icon on success card.
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/lib/toast';

export default function ForgotPasswordPage() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Stagger state triggers
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

    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      toast.success('Password reset link sent', `A link has been sent to ${email}`);
    }, 1200);
  };

  return (
    <main className="aurora-bg" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '24px' }}>
      {/* Background Orbs */}
      <div className="aurora-orb orb-indigo" />
      <div className="aurora-orb orb-emerald" />

      <div className="auth-card" style={{ width: '100%', maxWidth: '440px', padding: '40px', zIndex: 5 }}>
        
        {success ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            {/* Spring-in Mail icon */}
            <div className="spring-mail" style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#eef2ff',
              color: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              margin: '0 auto 24px',
            }}>
              ✉️
            </div>
            
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
              Check your email
            </h1>
            <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.6, marginBottom: '32px' }}>
              We have sent a secure password reset link to <strong>{email}</strong>. Please check your spam folder if it doesn't arrive.
            </p>

            <Link href="/login" className="premium-btn primary" style={{ width: '100%', textDecoration: 'none' }}>
              Back to Sign In
            </Link>
          </div>
        ) : (
          <div>
            {/* Header (stagger 0) */}
            <div style={{ transitionDelay: '0ms' }} className={`stagger-item ${staggerVisible[0] ? 'visible' : ''}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 24V8L12 18L18 8L24 24" stroke="#4f46e5" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="15" cy="11" r="2.5" fill="#10b981" />
                </svg>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>MUSHIN</span>
              </div>

              <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Reset password</h1>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '32px' }}>We'll send a recovery link to your inbox</p>
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
                  placeholder="you@company.pk"
                  required
                  disabled={loading}
                />
              </div>

              {/* Submit button (stagger 2) */}
              <div style={{ transitionDelay: '140ms' }} className={`stagger-item ${staggerVisible[2] ? 'visible' : ''}`}>
                <button
                  type="submit"
                  className="premium-btn indigo-gradient"
                  disabled={loading}
                  style={{ width: '100%', padding: '12px', fontWeight: 600, fontSize: '15px' }}
                >
                  {loading ? <span className="btn-spinner"></span> : 'Send Recovery Link'}
                </button>

                <p style={{ textAlign: 'center', fontSize: '14px', color: '#64748b', marginTop: '24px' }}>
                  Remember your password?{' '}
                  <Link href="/login" style={{ color: '#4f46e5', fontWeight: 600 }}>
                    Sign in
                  </Link>
                </p>
              </div>

            </form>
          </div>
        )}
      </div>
    </main>
  );
}
