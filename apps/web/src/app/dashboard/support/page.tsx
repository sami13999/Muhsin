'use client';

import React, { useState } from 'react';

interface Message {
  sender: string;
  avatarColor: string;
  initials: string;
  time: string;
  text: string;
}

interface Ticket {
  id: string;
  title: string;
  desc: string;
  status: 'in_progress' | 'open' | 'resolved';
  statusLabel: string;
  creator: string;
  timeAgo: string;
  conversation: Message[];
}

const INITIAL_TICKETS: Ticket[] = [
  {
    id: 'T-2041',
    title: 'Webhook retries failing on burst load',
    desc: "We're seeing 429s spike around 14:00 UTC on the webhook delivery endpoint...",
    status: 'in_progress',
    statusLabel: 'In progress',
    creator: 'Alex Chen',
    timeAgo: '2m ago',
    conversation: [
      {
        sender: 'Alex Chen',
        avatarColor: '#0f172a',
        initials: 'AC',
        time: 'Today · 14:02',
        text: "We're seeing 429s spike around 14:00 UTC on the webhook delivery endpoint. Retries don't appear to be honoring the Retry-After header."
      },
      {
        sender: 'Mira Solis',
        avatarColor: '#3b82f6',
        initials: 'MS',
        time: 'Today · 14:18',
        text: "Thanks for the report — we've reproduced the behavior and identified a regression in the retry scheduler. A patch is rolling out to your region within the hour."
      },
      {
        sender: 'Alex Chen',
        avatarColor: '#0f172a',
        initials: 'AC',
        time: 'Today · 14:21',
        text: "Awesome, thanks for the quick turnaround! Let us know once the rollout is complete so we can verify on our end."
      }
    ]
  },
  {
    id: 'T-2039',
    title: 'SSO group sync delay',
    desc: "New SCIM-provisioned members aren't showing up in lists immediately...",
    status: 'open',
    statusLabel: 'Open',
    creator: 'Priya R.',
    timeAgo: '1h ago',
    conversation: [
      {
        sender: 'Priya R.',
        avatarColor: '#ec4899',
        initials: 'PR',
        time: 'Today · 13:10',
        text: "New SCIM-provisioned members aren't showing up in workspace lists immediately. There is a delay of about 45 minutes. Is there a sync frequency setting we can adjust?"
      },
      {
        sender: 'Mira Solis',
        avatarColor: '#3b82f6',
        initials: 'MS',
        time: 'Today · 13:40',
        text: "Hi Priya, SCIM sync runs hourly by default to optimize API rate usage. We can trigger a manual sync for your workspace or increase the polling frequency if needed."
      }
    ]
  },
  {
    id: 'T-2031',
    title: 'Export to S3 — region request',
    desc: 'Can we route exports through eu-west-2 region directly?',
    status: 'open',
    statusLabel: 'Open',
    creator: 'Daniel P.',
    timeAgo: '3h ago',
    conversation: [
      {
        sender: 'Daniel P.',
        avatarColor: '#8b5cf6',
        initials: 'DP',
        time: 'Today · 11:15',
        text: "Our data compliance rules require us to keep exporter data in eu-west-2. Can we route our CSV/JSON exports through that region?"
      },
      {
        sender: 'Mira Solis',
        avatarColor: '#3b82f6',
        initials: 'MS',
        time: 'Today · 11:42',
        text: "Hi Daniel, I've requested our infrastructure worker to enable eu-west-2 destination bucket routing for your workspace config. Will update you as soon as it's provisioned."
      }
    ]
  },
  {
    id: 'T-2028',
    title: 'Workspace migration failed',
    desc: 'Database migrate failed with relation workspace_members already exists...',
    status: 'open',
    statusLabel: 'Open',
    creator: 'Farhan K.',
    timeAgo: '5h ago',
    conversation: [
      {
        sender: 'Farhan K.',
        avatarColor: '#10b981',
        initials: 'FK',
        time: 'Today · 09:30',
        text: 'Encountered a migration error while moving our staging environment to v2. Could you inspect the schema layout?'
      }
    ]
  },
  {
    id: 'T-2015',
    title: 'API Token expired',
    desc: 'Our credentials token has expired ahead of the scheduled renewal date...',
    status: 'resolved',
    statusLabel: 'Resolved',
    creator: 'Zainab B.',
    timeAgo: '1d ago',
    conversation: [
      {
        sender: 'Zainab B.',
        avatarColor: '#f43f5e',
        initials: 'ZB',
        time: 'Yesterday · 10:15',
        text: 'Credentials token expired early. We need an immediate rollover.'
      },
      {
        sender: 'Mira Solis',
        avatarColor: '#3b82f6',
        initials: 'MS',
        time: 'Yesterday · 10:45',
        text: 'The token has been successfully re-issued. You can now access all services.'
      }
    ]
  }
];

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS);
  const [activeTicketId, setActiveTicketId] = useState<string>('T-2041');
  const [newMessage, setNewMessage] = useState('');

  const activeTicket = tickets.find(t => t.id === activeTicketId) || tickets[0];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const updated = tickets.map(t => {
      if (t.id === activeTicket.id) {
        return {
          ...t,
          timeAgo: 'just now',
          conversation: [
            ...t.conversation,
            {
              sender: 'Alex Chen',
              avatarColor: '#0f172a',
              initials: 'AC',
              time: 'Today · Just now',
              text: newMessage
            }
          ]
        };
      }
      return t;
    });

    setTickets(updated);
    setNewMessage('');
  };

  const getStatusBadgeStyles = (status: Ticket['status']) => {
    switch (status) {
      case 'in_progress':
        return { backgroundColor: '#fef3c7', color: '#d97706' };
      case 'open':
        return { backgroundColor: '#eff6ff', color: '#2563eb' };
      case 'resolved':
        return { backgroundColor: '#f0fdf4', color: '#16a34a' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Support</h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '6px', margin: 0 }}>All your tickets, in one place. Average response: 18 min.</p>
        </div>
        <button style={{ display: 'inline-flex', alignItems: 'center', background: '#0f172a', color: '#ffffff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
            <path d="M12 5v14M5 12h14" />
          </svg>
          New ticket
        </button>
      </div>

      {/* Main Container */}
      <div className="support-page-grid" style={{ gap: '24px', minHeight: '600px' }}>
        
        {/* Left Column: Tickets list */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#ffffff', fontSize: '11px', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em' }}>
            ALL TICKETS · {tickets.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            {tickets.map(t => {
              const badgeStyle = getStatusBadgeStyles(t.status);
              const isActive = t.id === activeTicket.id;
              
              return (
                <div
                  key={t.id}
                  onClick={() => setActiveTicketId(t.id)}
                  style={{
                    padding: '20px',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    background: isActive ? '#f8fafc' : 'transparent',
                    borderLeft: `3px solid ${isActive ? '#0f172a' : 'transparent'}`,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>{t.id}</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', ...badgeStyle }}>
                      {t.statusLabel}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0', lineHeight: 1.4 }}>
                    {t.title}
                  </h4>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px 0', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {t.desc}
                  </p>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>
                    {t.creator} · {t.timeAgo}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Ticket detailed message thread */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          
          {/* Active Ticket Header */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>{activeTicket.id}</span>
              <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '6px', ...getStatusBadgeStyles(activeTicket.status) }}>
                {activeTicket.statusLabel}
              </span>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              {activeTicket.title}
            </h2>
          </div>

          {/* Active Ticket Message thread */}
          <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', background: '#ffffff' }}>
            {activeTicket.conversation.map((msg, index) => (
              <div key={index} style={{ display: 'flex', gap: '14px' }}>
                {/* Avatar Badge */}
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: msg.avatarColor,
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: '13px',
                  flexShrink: 0
                }}>
                  {msg.initials}
                </div>

                {/* Message Bubble Block */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{msg.sender}</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{msg.time}</span>
                  </div>
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    padding: '14px 18px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    color: '#334155',
                    lineHeight: 1.5,
                    maxWidth: '85%'
                  }}>
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Reply Form */}
          {activeTicket.status !== 'resolved' && (
            <form onSubmit={handleSendMessage} style={{ padding: '20px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '12px', background: '#ffffff' }}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message here..."
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '13px',
                  outline: 'none',
                  color: '#1e293b'
                }}
              />
              <button
                type="submit"
                style={{
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0 24px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease'
                }}
              >
                Send
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
