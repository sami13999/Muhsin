/**
 * MUSHIN 2.0 Design Tokens Registry
 * Canonical design system values for spacing, typography, colors, animations, accessibility, and states.
 * Under Section 5 Coding Standards, this file governs all layouts.
 */

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '32px',
  '4xl': '40px',
  '5xl': '48px',
  '6xl': '64px',
  grid: '24px',
};

export const radius = {
  none: '0px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  full: '9999px',
};

export const elevation = {
  flat: 'none',
  sm: '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
  md: '0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)',
  lg: '0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.03)',
  xl: '0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)',
  glow: '0 0 15px rgba(79, 70, 229, 0.15)',
  'glow-emerald': '0 0 15px rgba(16, 185, 129, 0.15)',
};

export const motion = {
  durations: {
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
    stagger: '70ms',
  },
  easings: {
    bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
  },
};

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  modal: 40,
  toast: 50,
  tooltip: 60,
};

export const colors = {
  surface: {
    primary: '#ffffff',
    secondary: '#f8fafc',
    tertiary: '#f1f5f9',
    inverse: '#0f172a',
    accent: '#eef2ff',
    card: '#ffffff',
    cardHover: '#fafafa',
  },
  text: {
    primary: '#0f172a',
    secondary: '#475569',
    muted: '#94a3b8',
    inverse: '#ffffff',
    accent: '#4f46e5',
  },
  accent: {
    indigo: '#4f46e5',
    indigoLight: '#c7d2fe',
    indigoDark: '#3730a3',
    emerald: '#10b981',
    emeraldLight: '#a7f3d0',
    emeraldDark: '#065f46',
  },
  status: {
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
  },
  platform: {
    instagram: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
    tiktok: '#000000',
    youtube: '#ff0000',
    all: '#4f46e5',
  },
};

export const typography = {
  family: {
    sans: 'var(--font-sans), Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  size: {
    xs: '12px',
    sm: '14px',
    md: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px',
    '5xl': '48px',
  },
  weight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    none: 1,
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.625,
  },
};

export const accessibility = {
  wcagContrastMin: 4.5,
  touchTargetMin: '44px',
  focusRing: '3px solid rgba(79, 70, 229, 0.4)',
  reducedMotionQuery: '@media (prefers-reduced-motion: reduce)',
};

export enum ComponentState {
  Default = 'default',
  Hover = 'hover',
  Active = 'active',
  Focus = 'focus',
  Selected = 'selected',
  Disabled = 'disabled',
  Loading = 'loading',
  Success = 'success',
}
