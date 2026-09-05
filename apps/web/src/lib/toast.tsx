/**
 * MUSHIN 2.0 Toast and Confirmation Dialog System
 * Fully interactive, stackable, animated, accessible alerts and destructive modals.
 * Falls back to native methods/no-ops if providers aren't mounted.
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

// ── Toast System Types ─────────────────────────────────────────

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  tone: ToastTone;
  message: string;
  description?: string;
  duration?: number;
  undoAction?: () => void;
}

interface ToastContextType {
  toast: (options: Omit<ToastMessage, 'id'>) => void;
  success: (msg: string, desc?: string, undo?: () => void) => void;
  error: (msg: string, desc?: string) => void;
  warning: (msg: string, desc?: string) => void;
  info: (msg: string, desc?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// ── Confirmation System Types ──────────────────────────────────

interface ConfirmOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

// ── Hook Implementations with Safe Fallbacks ───────────────────

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Graceful no-op / fallback console log
    return {
      toast: (opt: any) => console.log('Mock Toast:', opt.message),
      success: (msg: string) => console.log('Mock Success:', msg),
      error: (msg: string) => console.error('Mock Error:', msg),
      warning: (msg: string) => console.warn('Mock Warning:', msg),
      info: (msg: string) => console.info('Mock Info:', msg),
    };
  }
  return context;
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    // Graceful fallback to window.confirm
    return async (options: ConfirmOptions) => {
      if (typeof window !== 'undefined') {
        return window.confirm(`${options.title}\n\n${options.description}`);
      }
      return false;
    };
  }
  return context.confirm;
}

// ── Providers ──────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(({ tone, message, description, duration, undoAction }: Omit<ToastMessage, 'id'>) => {
    const id = crypto.randomUUID();
    const defaultDuration = tone === 'error' ? 6000 : tone === 'warning' ? 5000 : 3500;
    const finalDuration = duration ?? defaultDuration;

    setToasts((prev) => {
      const next = [...prev, { id, tone, message, description, duration: finalDuration, undoAction }];
      if (next.length > 3) {
        return next.slice(next.length - 3); // Max 3 stacked
      }
      return next;
    });

    setTimeout(() => {
      removeToast(id);
    }, finalDuration);
  }, [removeToast]);

  const success = useCallback((msg: string, desc?: string, undo?: () => void) => {
    toast({ tone: 'success', message: msg, description: desc, undoAction: undo });
  }, [toast]);

  const error = useCallback((msg: string, desc?: string) => {
    toast({ tone: 'error', message: msg, description: desc });
  }, [toast]);

  const warning = useCallback((msg: string, desc?: string) => {
    toast({ tone: 'warning', message: msg, description: desc });
  }, [toast]);

  const info = useCallback((msg: string, desc?: string) => {
    toast({ tone: 'info', message: msg, description: desc });
  }, [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      {/* Toast rendering portal */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none',
      }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            className="fade-in"
            style={{
              pointerEvents: 'auto',
              background: '#0f172a',
              color: '#ffffff',
              padding: '12px 16px',
              borderRadius: '8px',
              minWidth: '280px',
              maxWidth: '360px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
              borderLeft: `4px solid ${
                t.tone === 'success' ? '#10b981' :
                t.tone === 'error' ? '#ef4444' :
                t.tone === 'warning' ? '#f59e0b' : '#3b82f6'
              }`,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '14px' }}>{t.message}</span>
              <button
                onClick={() => removeToast(t.id)}
                style={{
                  background: 'transparent',
                  color: '#94a3b8',
                  padding: '2px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>
            {t.description && (
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>{t.description}</span>
            )}
            {t.undoAction && (
              <button
                onClick={() => {
                  t.undoAction?.();
                  removeToast(t.id);
                }}
                style={{
                  alignSelf: 'flex-start',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#10b981',
                  border: 'none',
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  marginTop: '4px',
                }}
              >
                Undo
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ── Confirmation Dialog Provider ───────────────────────────────

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<{
    isOpen: boolean;
    options: ConfirmOptions | null;
    resolve: ((val: boolean) => void) | null;
  }>({
    isOpen: false,
    options: null,
    resolve: null,
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setModal({
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  const handleClose = (value: boolean) => {
    if (modal.resolve) {
      modal.resolve(value);
    }
    setModal({
      isOpen: false,
      options: null,
      resolve: null,
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modal.isOpen) {
        handleClose(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modal.isOpen]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {modal.isOpen && modal.options && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          zIndex: 99999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '16px',
        }}
        onClick={() => handleClose(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-desc"
          >
            <h3 id="confirm-title" style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
              {modal.options.title}
            </h3>
            <p id="confirm-desc" style={{ fontSize: '14px', color: '#475569', lineHeight: 1.5, marginBottom: '24px' }}>
              {modal.options.description}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                className="premium-btn secondary"
                onClick={() => handleClose(false)}
              >
                {modal.options.cancelText ?? 'Cancel'}
              </button>
              <button
                className={`premium-btn ${modal.options.isDestructive ? 'primary' : 'indigo-gradient'}`}
                style={modal.options.isDestructive ? { backgroundColor: '#ef4444', color: '#ffffff', border: '1px solid #ef4444' } : {}}
                onClick={() => handleClose(true)}
                autoFocus
              >
                {modal.options.confirmText ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
