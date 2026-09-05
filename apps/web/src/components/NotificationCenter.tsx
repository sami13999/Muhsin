/**
 * MUSHIN 2.0 Notification Center
 * Bell-triggered dropdown, unread badges, tone priorities, categories, Mark All Read,
 * and click-outside dismissal handler.
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/lib/toast';

export interface NotificationItem {
  id: string;
  category: 'campaigns' | 'credits' | 'team' | 'system';
  tone: 'info' | 'success' | 'warning' | 'critical';
  title: string;
  message: string;
  read: boolean;
  time: string;
}

export default function NotificationCenter() {
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'campaigns' | 'credits' | 'team' | 'system'>('all');
  const containerRef = useRef<HTMLDivElement>(null);

  // Mock Notifications database
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-1',
      category: 'credits',
      tone: 'warning',
      title: 'Low Credits Threshold',
      message: 'Your workspace credits balance is at 14 (below threshold 25). Fast searches may be gated soon.',
      read: false,
      time: '10m ago',
    },
    {
      id: 'notif-2',
      category: 'campaigns',
      tone: 'success',
      title: 'Campaign Draft Approved',
      message: 'Ayesha Malik approved the content proposal for Eid Fashion Campaign.',
      read: false,
      time: '1h ago',
    },
    {
      id: 'notif-2-5',
      category: 'campaigns',
      tone: 'success',
      title: 'Outreach Campaign Enrolled',
      message: '12 new creators were enrolled into the Summer Launch Campaign.',
      read: false,
      time: '2h ago',
    },
    {
      id: 'notif-3',
      category: 'team',
      tone: 'info',
      title: 'New Member Joined',
      message: 'Mira Solis was added to Workspace: BrandX Pakistan.',
      read: true,
      time: '1d ago',
    },
    {
      id: 'notif-4',
      category: 'system',
      tone: 'critical',
      title: 'Modash Provider Latency Spike',
      message: 'Modash API node experiencing high latency (2.1s). Swapping priority to cached graph.',
      read: true,
      time: '2d ago',
    },
  ]);

  // Handle click outside to dismiss
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success('All marked as read', 'Your notification feed is cleared.');
  };

  const handleToggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'unread') return !n.read;
    return n.category === activeFilter;
  });

  const getToneColor = (tone: NotificationItem['tone']) => {
    switch (tone) {
      case 'success': return '#10b981'; // Emerald
      case 'warning': return '#f59e0b'; // Amber
      case 'critical': return '#ef4444'; // Red
      default: return '#3b82f6'; // Blue
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'transparent',
          border: 'none',
          padding: '8px',
          cursor: 'pointer',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label="View notifications"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '0px',
            right: '0px',
            background: '#ef4444',
            color: '#ffffff',
            borderRadius: '50%',
            width: '16px',
            height: '16px',
            fontSize: '9px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="notification-dropdown fade-in" style={{
          position: 'absolute',
          top: '48px',
          right: 0,
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.15), 0 10px 10px -5px rgba(15, 23, 42, 0.05)',
          width: '380px',
          maxWidth: 'calc(100vw - 24px)',
          zIndex: 999,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid #e2e8f0' }}>
            <span style={{ fontWeight: 600, fontSize: '15px', color: '#0f172a' }}>Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{ background: 'transparent', color: '#4f46e5', border: 'none', fontSize: '12px', fontWeight: 500, padding: 0 }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Filter Categories */}
          <div style={{ display: 'flex', background: '#f8fafc', padding: '8px', gap: '4px', borderBottom: '1px solid #e2e8f0', overflowX: 'auto' }}>
            {(['all', 'unread', 'campaigns', 'credits', 'team', 'system'] as const).map((filter) => (
              <button
                key={filter}
                style={{
                  background: activeFilter === filter ? '#0f172a' : 'transparent',
                  color: activeFilter === filter ? '#ffffff' : '#64748b',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  textTransform: 'capitalize',
                  whiteSpace: 'nowrap',
                }}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
            {filteredNotifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>📭</div>
                <div style={{ fontSize: '13px' }}>No notifications found</div>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleToggleRead(notif.id)}
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid #f1f5f9',
                    background: notif.read ? '#ffffff' : '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    gap: '12px',
                    position: 'relative',
                    transition: 'background-color 0.2s',
                  }}
                >
                  {/* Indicator Dot */}
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: getToneColor(notif.tone),
                    marginTop: '4px',
                    flexShrink: 0,
                  }} />

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                      <span style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>{notif.title}</span>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>{notif.time}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>{notif.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
}
