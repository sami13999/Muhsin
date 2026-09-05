'use client';

import React, { useState } from 'react';
import { useToast } from '@/lib/toast';

export default function FilesCatalog() {
  const toast = useToast();
  const [files] = useState([
    { name: 'Eid_Sale_Brief.pdf', size: '1.4 MB', uploader: 'Ahmed', date: '3d ago' },
    { name: 'moodboard_v2.png', size: '2.1 MB', uploader: 'Sana', date: '2d ago' },
    { name: 'caption_variants.docx', size: '42 KB', uploader: 'Ayesha', date: '1d ago' },
    { name: 'spec_sheet.pdf', size: '612 KB', uploader: 'Ahmed', date: '6h ago' }
  ]);

  const handleUpload = () => {
    toast.info('Upload File', 'File dialog opened.');
  };

  return (
    <div style={{ padding: '24px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', fontFamily: "'Inter', sans-serif" }}>
      {/* File Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Files</h3>
        <button 
          onClick={handleUpload}
          style={{ background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Upload
        </button>
      </div>

      {/* Files List Wrapper */}
      <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        {files.map((file, idx) => (
          <div 
            key={idx} 
            style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', borderBottom: idx === files.length - 1 ? 'none' : '1px solid #f1f5f9' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {/* Document Icon Box */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                📄
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{file.name}</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
                  {file.size} . uploaded by {file.uploader} . {file.date}
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => toast.success('Actions opened')}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '16px', fontWeight: 700 }}
            >
              ...
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
