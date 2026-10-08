'use client';

import React, { useState } from 'react';
import { useToast } from '@/lib/toast';

export default function MessagesTab() {
  const toast = useToast();
  const [conversations, setConversations] = useState([
    { id: '1', name: 'Ayesha Malik', handle: '@ayeshamalik', platform: 'Instagram', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80', text: 'Sounds good — I\'ll draft the caption tonight.', time: '12m' },
    { id: '2', name: 'Sana Riaz', handle: '@sanaa.k', platform: 'Instagram', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80', text: 'Can we shift delivery to Jul 06?', time: '1h' },
    { id: '3', name: 'Usman Tariq', handle: '@usmantariq', platform: 'YouTube', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80', text: 'Signed — sending across the video today.', time: '3h' }
  ]);
  const [activeId, setActiveId] = useState('1');
  const [chatHistory, setChatHistory] = useState<Record<string, any[]>>({
    '1': [
      { id: 'm1', sender: 'them', text: 'Hey Ahmed — got the brief, looks good overall. Two thoughts on tone.' },
      { id: 'm2', sender: 'me', text: 'All ears. What\'s the vibe you\'d want to keep or adjust?' },
      { id: 'm3', sender: 'them', text: 'Less brand jargon, more real narration. I want to talk about how I actually wear it, not read a spec sheet.' }
    ],
    '2': [{ id: 'm4', sender: 'them', text: 'Can we shift delivery to Jul 06?' }],
    '3': [{ id: 'm5', sender: 'them', text: 'Signed — sending across the video today.' }]
  });
  const [inputVal, setInputVal] = useState('');

  const activeConv = conversations.find(c => c.id === activeId)!;

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [attachment, setAttachment] = useState<{ url: string; name: string; type: string } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAttachment({
            url: event.target.result as string,
            name: file.name,
            type: file.type.startsWith('image/') ? 'image' : 'file',
          });
          toast.success('Attachment added', file.name);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() && !attachment) return;
    const newMsg = {
      id: `m-${Date.now()}`,
      sender: 'me',
      text: inputVal,
      attachment: attachment ? { ...attachment } : undefined,
    };
    setChatHistory({ ...chatHistory, [activeId]: [...(chatHistory[activeId] || []), newMsg] });
    setConversations(conversations.map(c => c.id === activeId ? { ...c, text: attachment ? `[Attachment: ${attachment.name}] ${inputVal}` : inputVal, time: 'Just now' } : c));
    setInputVal('');
    setAttachment(null);
    toast.success('Message sent');
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', height: '480px', fontFamily: "'Inter', sans-serif", background: '#ffffff' }}>
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*,video/*,application/pdf"
        capture="environment"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />
      <div style={{ borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}><h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Conversations</h3></div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {conversations.map(c => (
            <div key={c.id} onClick={() => setActiveId(c.id)} style={{ display: 'flex', gap: '12px', padding: '14px 16px', cursor: 'pointer', background: activeId === c.id ? '#f8fafc' : 'transparent', borderBottom: '1px solid #f1f5f9' }}>
              <img src={c.avatar} alt={c.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <strong style={{ fontSize: '13px', color: '#0f172a', fontWeight: activeId === c.id ? 700 : 600 }}>{c.name}</strong>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>{c.time}</span>
                </div>
                <div style={{ fontSize: '12px', color: activeId === c.id ? '#475569' : '#64748b', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', marginTop: '3px' }}>{c.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
          <strong style={{ fontSize: '15px', color: '#0f172a' }}>{activeConv.name}</strong>
          <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{activeConv.platform} · {activeConv.handle}</span>
        </div>
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', background: '#fafafa' }}>
          {chatHistory[activeId]?.map(msg => (
            <div key={msg.id} style={{ alignSelf: msg.sender === 'me' ? 'flex-end' : 'flex-start', background: msg.sender === 'me' ? '#0f172a' : '#ffffff', color: msg.sender === 'me' ? '#ffffff' : '#0f172a', padding: '10px 16px', borderRadius: '12px', border: msg.sender === 'me' ? 'none' : '1px solid #e2e8f0', maxWidth: '70%', fontSize: '13px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)', lineHeight: 1.4 }}>
              {msg.attachment && (
                <div style={{ marginBottom: '8px' }}>
                  {msg.attachment.type === 'image' ? (
                    <img src={msg.attachment.url} alt="attachment" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ background: 'rgba(255,255,255,0.15)', padding: '6px 10px', borderRadius: '6px', fontSize: '12px' }}>📎 {msg.attachment.name}</div>
                  )}
                </div>
              )}
              {msg.text}
            </div>
          ))}
        </div>
        {attachment && (
          <div style={{ padding: '8px 16px', background: '#eff6ff', borderTop: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#1e40af' }}>
            <span>📎 Attached: <strong>{attachment.name}</strong></span>
            <button type="button" onClick={() => setAttachment(null)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}>✕</button>
          </div>
        )}
        <form onSubmit={handleSend} style={{ padding: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach photo from Camera or Gallery"
            style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', cursor: 'pointer' }}
          >
            📷
          </button>
          <input type="text" placeholder={`Reply to ${activeConv.name.split(' ')[0]}...`} value={inputVal} onChange={e => setInputVal(e.target.value)} style={{ flex: 1, padding: '10px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />
          <button type="submit" style={{ background: '#0f172a', color: '#ffffff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>Send</button>
        </form>
      </div>
    </div>
  );
}
