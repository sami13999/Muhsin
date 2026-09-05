/**
 * MUSHIN 2.0 Error Page Component (Volume 9 Spec)
 * Reusable error page supporting 12 presets:
 * 400, 401, 403, 404 ("Lost in the noise"), 409, 429, 500, maintenance, offline, no-credits, workspace-missing, search-failed.
 * Tone-driven styles (slate/amber/red/indigo), support buttons, and layout.
 */

'use client';

import React from 'react';

export type ErrorPreset =
  | '400'
  | '401'
  | '403'
  | '404'
  | '409'
  | '429'
  | '500'
  | 'maintenance'
  | 'offline'
  | 'no-credits'
  | 'workspace-missing'
  | 'search-failed';

interface ErrorPageProps {
  preset: ErrorPreset;
  diagnosticId?: string;
  onRetry?: () => void;
  onBack?: () => void;
}

export default function ErrorPage({ preset, diagnosticId = 'ERR-UNK-0000', onRetry, onBack }: ErrorPageProps) {
  
  // Custom presets database
  const presets: Record<ErrorPreset, {
    eyebrow: string;
    title: string;
    body: string;
    icon: string;
    tone: 'slate' | 'amber' | 'red' | 'indigo';
    primaryText: string;
    secondaryText?: string;
  }> = {
    '400': {
      eyebrow: 'Bad Request',
      title: 'Invalid Request Shape',
      body: 'The server could not verify the syntax or parameters of your submission. Please check inputs.',
      icon: '⚠️',
      tone: 'slate',
      primaryText: 'Back to safety',
    },
    '401': {
      eyebrow: 'Unauthorized',
      title: 'Session Expired',
      body: 'Your credentials could not be verified. Please sign in again to refresh your access token.',
      icon: '🔑',
      tone: 'indigo',
      primaryText: 'Log In Again',
    },
    '403': {
      eyebrow: 'Forbidden',
      title: 'Access Restricted',
      body: 'Your workspace role does not carry permissions to perform this action. Contact owner.',
      icon: '🚫',
      tone: 'red',
      primaryText: 'Back to safety',
    },
    '404': {
      eyebrow: '404 Error',
      title: 'Lost in the Noise',
      body: 'The creator profile or dashboard view you are seeking has been archived or does not exist.',
      icon: '🛰️',
      tone: 'slate',
      primaryText: 'Back to Dashboard',
    },
    '409': {
      eyebrow: 'Conflict',
      title: 'Duplicate Resource',
      body: 'A creator with this identifier or WABA handle already exists in your workspace databases.',
      icon: '👥',
      tone: 'amber',
      primaryText: 'View Existing Profile',
    },
    '429': {
      eyebrow: 'Too Many Requests',
      title: 'Rate Limit Exhausted',
      body: 'You have run too many operations in a short period. Please wait 1 minute before retrying.',
      icon: '⏳',
      tone: 'amber',
      primaryText: 'Retry Operation',
    },
    '500': {
      eyebrow: 'Internal Error',
      title: 'System Failure',
      body: 'An unexpected node failure occurred on our modash/apify scraper clusters. Our engineers have been alerted.',
      icon: '💥',
      tone: 'red',
      primaryText: 'Retry Search',
      secondaryText: 'Check System Health',
    },
    'maintenance': {
      eyebrow: 'System Maintenance',
      title: 'Scoring Engine Upgrade',
      body: 'We are currently upgrading the MUSHIN IQ algorithm parameters. We will return online within 30 minutes.',
      icon: '⚙️',
      tone: 'indigo',
      primaryText: 'Check Updates',
    },
    'offline': {
      eyebrow: 'Connection Offline',
      title: 'Disconnected',
      body: 'Unable to establish contact with the gateway server. Check your network or local Wi-Fi router.',
      icon: '📡',
      tone: 'slate',
      primaryText: 'Reconnect Now',
    },
    'no-credits': {
      eyebrow: 'Gated Action',
      title: 'Credits Balance Exhausted',
      body: 'Your search requires credits to query modash queues. You have 0 available. No credits have been charged.',
      icon: '⚡',
      tone: 'amber',
      primaryText: 'Purchase Credits Pack',
      secondaryText: 'Cancel & return',
    },
    'workspace-missing': {
      eyebrow: 'Tenancy Error',
      title: 'Workspace Missing',
      body: 'You are not registered in any active workspace groups. Please create one to initialize analytics.',
      icon: '🏢',
      tone: 'red',
      primaryText: 'Register Workspace',
    },
    'search-failed': {
      eyebrow: 'Query Failed',
      title: 'Modash Graph Refused Search',
      body: 'The social network returned an invalid handle token. No database changes were recorded.',
      icon: '❌',
      tone: 'red',
      primaryText: 'Try Another Search',
    },
  };

  const current = presets[preset];

  // Helper colors
  const toneColors = {
    slate: { border: '#cbd5e1', bg: '#f8fafc', icon: '#64748b', button: '#475569' },
    amber: { border: '#fef3c7', bg: '#fffbeb', icon: '#d97706', button: '#d97706' },
    red: { border: '#fee2e2', bg: '#fdf2f2', icon: '#ef4444', button: '#ef4444' },
    indigo: { border: '#eef2ff', bg: '#f5f3ff', icon: '#4f46e5', button: '#4f46e5' },
  };

  const colors = toneColors[current.tone];

  return (
    <div style={{
      width: '100%',
      maxWidth: '480px',
      padding: '32px',
      background: '#ffffff',
      border: `1px solid ${colors.border}`,
      borderRadius: '16px',
      boxShadow: '0 10px 15px -3px rgba(15,23,42,0.05)',
      textAlign: 'center',
    }}>
      
      {/* Icon */}
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        background: colors.bg,
        color: colors.icon,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '28px',
        margin: '0 auto 20px',
      }}>
        {current.icon}
      </div>

      {/* Eyebrow */}
      <span style={{
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: colors.icon,
        display: 'block',
        marginBottom: '6px',
      }}>
        {current.eyebrow}
      </span>

      {/* Title */}
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
        {current.title}
      </h2>

      {/* Body text */}
      <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.5, marginBottom: '28px' }}>
        {current.body}
      </p>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button
          onClick={onRetry || onBack}
          className="premium-btn primary"
          style={{ width: '100%', backgroundColor: colors.button, borderColor: colors.button }}
        >
          {current.primaryText}
        </button>
        {current.secondaryText && (
          <button
            onClick={onBack}
            className="premium-btn secondary"
            style={{ width: '100%' }}
          >
            {current.secondaryText}
          </button>
        )}
      </div>

      {/* Diagnostics / Footnotes */}
      <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '24px', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
        <span>ID: <strong>{diagnosticId}</strong></span>
        <a href="https://support.mushin.io" target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5', fontWeight: 600 }}>Contact support</a>
      </div>

    </div>
  );
}
