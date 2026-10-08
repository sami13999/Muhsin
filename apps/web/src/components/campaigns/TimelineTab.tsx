'use client';

import React, { useState } from 'react';
import { useToast } from '@/lib/toast';

interface Milestone {
  id: string;
  date: string;
  title: string;
  actor: string;
  status: 'completed' | 'pending' | 'upcoming';
}

const INITIAL_MILESTONES: Milestone[] = [
  { id: 'm-1', date: 'Jun 22', title: 'Campaign brief & deliverables sent to roster', actor: 'Ayesha Malik', status: 'completed' },
  { id: 'm-2', date: 'Jul 04', title: '@sanaa.k Instagram Reel live', actor: 'Sana Riaz', status: 'completed' },
  { id: 'm-3', date: 'Jul 08', title: '@zaintech YouTube review upload due', actor: 'Zain Ahmed', status: 'pending' },
  { id: 'm-4', date: 'Jul 12', title: '@fatimabeauty story set drop', actor: 'Fatima Ali', status: 'upcoming' },
  { id: 'm-5', date: 'Jul 20', title: 'Campaign closes & ROI report auto-generated', actor: 'System', status: 'upcoming' }
];

export default function TimelineTab() {
  const toast = useToast();
  const [milestones, setMilestones] = useState<Milestone[]>(INITIAL_MILESTONES);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newActor, setNewActor] = useState('');

  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const item: Milestone = {
      id: `m-${Date.now()}`,
      date: newDate.trim() || 'TBD',
      title: newTitle.trim(),
      actor: newActor.trim() || 'Team',
      status: 'pending'
    };

    setMilestones([...milestones, item]);
    setNewTitle('');
    setNewDate('');
    setNewActor('');
    setShowAddForm(false);
    toast.success('Milestone Added', `Added "${item.title}" to campaign timeline.`);
  };

  const handleToggleStatus = (id: string) => {
    setMilestones(milestones.map(m => {
      if (m.id === id) {
        const nextStatus = m.status === 'completed' ? 'pending' : 'completed';
        toast.info('Milestone Updated', `Marked as ${nextStatus}`);
        return { ...m, status: nextStatus };
      }
      return m;
    }));
  };

  const getStatusBadge = (status: Milestone['status']) => {
    if (status === 'completed') {
      return { bg: '#ecfdf5', text: '#10b981', label: 'Completed' };
    }
    if (status === 'pending') {
      return { bg: '#fff7ed', text: '#f97316', label: 'In Progress' };
    }
    return { bg: '#f1f5f9', text: '#64748b', label: 'Upcoming' };
  };

  return (
    <div style={{ padding: '24px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', fontFamily: "'Inter', sans-serif", boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Campaign Timeline & Milestones
          </h3>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Track deliverable schedules, go-live dates, and payment milestones.</p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{ background: '#0f172a', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
        >
          {showAddForm ? '✕ Cancel' : '+ Add Milestone'}
        </button>
      </div>

      {/* Add Milestone Form */}
      {showAddForm && (
        <form onSubmit={handleAddMilestone} style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <input
            type="text"
            placeholder="Milestone title (e.g. Reel post live)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            style={{ flex: 2, minWidth: '180px', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
          />
          <input
            type="text"
            placeholder="Date (e.g. Jul 15)"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            style={{ flex: 1, minWidth: '100px', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
          />
          <input
            type="text"
            placeholder="Owner / Creator"
            value={newActor}
            onChange={(e) => setNewActor(e.target.value)}
            style={{ flex: 1, minWidth: '120px', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
          />
          <button
            type="submit"
            style={{ background: '#4f46e5', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
          >
            Save Milestone
          </button>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', marginTop: '12px' }}>
        {/* Vertical Line */}
        <div style={{ position: 'absolute', left: '76px', top: '12px', bottom: '12px', width: '2px', background: '#e2e8f0' }} />

        {milestones.map((m) => {
          const badge = getStatusBadge(m.status);
          return (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              {/* Date Badge */}
              <span style={{
                width: '64px',
                fontSize: '11px',
                fontWeight: 700,
                padding: '4px 8px',
                borderRadius: '6px',
                textAlign: 'center',
                background: badge.bg,
                color: badge.text,
                flexShrink: 0
              }}>
                {m.date}
              </span>

              {/* Node Dot */}
              <div
                onClick={() => handleToggleStatus(m.id)}
                title="Click to toggle status"
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: badge.text,
                  border: '2px solid #ffffff',
                  boxShadow: '0 0 0 2px ' + badge.bg,
                  zIndex: 10,
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              />

              {/* Text info */}
              <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', textDecoration: m.status === 'completed' ? 'line-through' : 'none', opacity: m.status === 'completed' ? 0.7 : 1 }}>
                    {m.title}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    Owner: {m.actor}
                  </div>
                </div>

                <button
                  onClick={() => handleToggleStatus(m.id)}
                  style={{
                    background: badge.bg,
                    color: badge.text,
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    fontSize: '10px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {badge.label}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
