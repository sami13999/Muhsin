'use client';

interface CreatorHeaderProps {
  name: string;
  handle: string;
  platform: string;
  location: string | null;
  niches: (string | null)[];
}

export default function CreatorHeader({ name, handle, platform, location, niches }: CreatorHeaderProps) {
  const platformColors: Record<string, { bg: string; text: string }> = {
    instagram: { bg: '#fce7f3', text: '#be185d' },
    tiktok: { bg: '#f3f4f6', text: '#111827' },
    youtube: { bg: '#fee2e2', text: '#dc2626' },
    twitter: { bg: '#dbeafe', text: '#2563eb' },
    facebook: { bg: '#dbeafe', text: '#1d4ed8' },
  };

  const colors = platformColors[platform] ?? { bg: '#f3f4f6', text: '#374151' };

  return (
    <div style={{
      background: 'white',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      padding: '24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        {/* Avatar placeholder */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: '#f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          fontWeight: 600,
          color: '#64748b',
        }}>
          {name.charAt(0).toUpperCase()}
        </div>

        <div style={{ flex: 1 }}>
          {/* Name and handle */}
          <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '4px' }}>{name}</h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '12px' }}>
            {handle}
          </p>

          {/* Platform badge */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 500,
              background: colors.bg,
              color: colors.text,
            }}>
              {platform}
            </span>

            {location && (
              <span style={{
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                background: '#f1f5f9',
                color: '#64748b',
              }}>
                {location}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Niches */}
      {niches.filter(Boolean).length > 0 && (
        <div style={{ marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>Niches</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {niches.filter(Boolean).map((niche, i) => (
              <span key={i} style={{
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                background: i === 0 ? '#dbeafe' : '#f1f5f9',
                color: i === 0 ? '#1e40af' : '#64748b',
                fontWeight: i === 0 ? 500 : 400,
              }}>
                {niche}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
