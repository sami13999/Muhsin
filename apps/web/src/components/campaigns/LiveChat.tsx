'use client';

import React, { useState } from 'react';
import { useToast } from '@/lib/toast';

interface Message {
  id: string;
  sender: 'me' | 'them';
  text: string;
  time: string;
}

interface LiveChatProps {
  initialMessages: Message[];
}

export default function LiveChat({ initialMessages }: LiveChatProps) {
  const toast = useToast();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'me',
      text: newMessage,
      time: 'Just now',
    };

    setMessages([...messages, newMsg]);
    setNewMessage('');
    toast.success('Message sent', 'Inbox sync updated.');
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', height: '350px' }}>
      <div style={{ background: '#f8fafc', borderRight: '1px solid #e2e8f0', padding: '12px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em' }}>THREADS</span>
        <div style={{ background: '#eef2ff', color: '#4f46e5', padding: '8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, marginTop: '8px' }}>
          Ayesha Malik
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
        <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                alignSelf: m.sender === 'me' ? 'flex-end' : 'flex-start',
                background: m.sender === 'me' ? '#4f46e5' : '#f1f5f9',
                color: m.sender === 'me' ? '#ffffff' : '#0f172a',
                padding: '10px 14px',
                borderRadius: '8px',
                maxWidth: '70%',
                fontSize: '13px',
              }}
            >
              <div>{m.text}</div>
              <span style={{ fontSize: '9px', opacity: 0.7, display: 'block', textAlign: 'right', marginTop: '4px' }}>{m.time}</span>
            </div>
          ))}
        </div>
        <form onSubmit={handleSendMessage} style={{ padding: '12px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '8px' }}>
          <input
            type="text"
            className="premium-input"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message thread..."
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
          />
          <button type="submit" className="premium-btn primary" style={{ cursor: 'pointer' }}>Send</button>
        </form>
      </div>
    </div>
  );
}
