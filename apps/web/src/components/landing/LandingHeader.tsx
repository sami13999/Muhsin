'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function LandingHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 850);
    };
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <>
      {/* ── Mobile Fixed Top Navigation (< 850px) ── */}
      {isMobile ? (
        <header
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '60px',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            zIndex: 10000,
          }}
        >
          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
            <img src="/logo.png" alt="MUSHIN Logo" style={{ height: '36px', width: 'auto', display: 'block' }} />
            <span style={{ color: '#0f172a', fontWeight: 800, letterSpacing: '0.12em', fontSize: '0.85rem' }}>
              MUSHIN
            </span>
          </Link>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link
              href="/login"
              style={{
                color: '#475569',
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'none',
                padding: '6px 10px',
              }}
            >
              Log in
            </Link>
            <Link
              href="/signup"
              style={{
                background: '#0f172a',
                color: '#ffffff',
                padding: '6px 14px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Get started
            </Link>
          </div>
        </header>
      ) : (
        /* ── Desktop Floating Pill Header (>= 850px) ── */
        <div
          style={{
            position: 'fixed',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: isScrolled ? '70%' : '80%',
            maxWidth: '1000px',
            zIndex: 10000,
            transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <header
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              height: '64px',
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              borderRadius: '9999px',
              padding: '0 32px',
              boxShadow: '0 10px 30px -10px rgba(15,23,42,0.06)',
            }}
          >
            {/* Left Links */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <a href="#platform" style={{ color: '#475569', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}>Platform</a>
              <a href="#pricing" style={{ color: '#475569', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}>Pricing</a>
            </nav>

            {/* Center Logo */}
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <img src="/logo.png" alt="MUSHIN Logo" style={{ height: '45px', width: 'auto', display: 'block' }} />
              <span style={{ color: 'rgb(15, 23, 42)', fontWeight: 700, letterSpacing: '0.14em', fontSize: '0.875rem', lineHeight: 1 }}>
                MUSHIN
              </span>
            </Link>

            {/* Right Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <a href="#faq" style={{ color: '#475569', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}>FAQ</a>
              <a href="/docs" style={{ color: '#475569', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}>Docs</a>
              <Link href="/login" style={{ color: '#475569', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}>
                Log in
              </Link>
              <Link href="/signup" style={{ background: '#0f172a', color: '#ffffff', padding: '8px 18px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>
                Get started
              </Link>
            </div>
          </header>
        </div>
      )}
    </>
  );
}
