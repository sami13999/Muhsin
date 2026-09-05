'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { sidebarSections } from './DashboardSidebarLinks';

interface DashboardSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function DashboardSidebar({ isOpen = false, onClose }: DashboardSidebarProps) {
  const pathname = usePathname();

  const handleLinkClick = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 99,
          }}
          className="mobile-backdrop"
        />
      )}

      <aside
        className={`dashboard-sidebar ${isOpen ? 'mobile-open' : ''}`}
        style={{
          width: '260px',
          background: '#ffffff',
          borderRight: '1px solid #e2e8f0',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          boxSizing: 'border-box',
          overflowY: 'auto',
        }}
      >
        {/* Brand Logo & Mobile Close Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <Link href="/dashboard" onClick={handleLinkClick} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <img src="/logo.png" alt="MUSHIN Logo" style={{ height: '36px', width: 'auto', maxHeight: '36px', objectFit: 'contain', display: 'block' }} />
            <span style={{ color: '#0f172a', fontWeight: 800, letterSpacing: '0.08em', fontSize: '18px', fontFamily: "'Inter', sans-serif" }}>
              MUSHIN
            </span>
          </Link>

          {/* Close button on mobile */}
          {onClose && (
            <button
              onClick={onClose}
              className="mobile-close-btn"
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#64748b',
                padding: '4px',
                lineHeight: 1,
              }}
              aria-label="Close menu"
            >
              ✕
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {sidebarSections.map((sect) => (
            <div key={sect.title}>
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                {sect.title}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {sect.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleLinkClick}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: isActive ? 600 : 500,
                        textDecoration: 'none',
                        background: isActive ? '#0f172a' : 'transparent',
                        color: isActive ? '#ffffff' : '#64748b',
                        transition: 'all 0.2s',
                      }}
                    >
                      <span>{item.icon}</span>
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Back to site action */}
        <Link
          href="/"
          onClick={handleLinkClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 12px 0',
            fontSize: '13px',
            fontWeight: 600,
            color: '#64748b',
            textDecoration: 'none',
            borderTop: '1px solid #e2e8f0',
            marginTop: '16px'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          <span>Back to site</span>
        </Link>
      </aside>
    </>
  );
}
