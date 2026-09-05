'use client';

interface AudienceDemographicsProps {
  audienceData: Record<string, unknown> | null;
}

export default function AudienceDemographics({ audienceData }: AudienceDemographicsProps) {
  if (!audienceData) {
    return (
      <div style={{
        background: 'white',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        padding: '24px',
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Audience Demographics</h2>
        <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
          <p>Data unavailable</p>
          <p style={{ fontSize: '12px', marginTop: '8px' }}>
            Audience demographic data is not yet available for this creator.
          </p>
        </div>
      </div>
    );
  }

  // Extract demographic data from verdict
  const ageDistribution = audienceData['age_distribution'] as Record<string, number> | undefined;
  const genderSplit = audienceData['gender_split'] as Record<string, number> | undefined;
  const topCities = audienceData['top_cities'] as string[] | undefined;
  const topCountries = audienceData['top_countries'] as string[] | undefined;

  return (
    <div style={{
      background: 'white',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      padding: '24px',
    }}>
      <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Audience Demographics</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Age Distribution */}
        {ageDistribution && Object.keys(ageDistribution).length > 0 && (
          <div>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>Age Distribution</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {Object.entries(ageDistribution).map(([range, percentage]) => (
                <div key={range} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', width: '60px', color: '#64748b' }}>{range}</span>
                  <div style={{ flex: 1, height: '8px', background: '#f1f5f9', borderRadius: '4px' }}>
                    <div style={{
                      width: `${percentage}%`,
                      height: '100%',
                      background: '#3b82f6',
                      borderRadius: '4px',
                    }} />
                  </div>
                  <span style={{ fontSize: '12px', width: '40px', textAlign: 'right' }}>
                    {(percentage as number).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gender Split */}
        {genderSplit && Object.keys(genderSplit).length > 0 && (
          <div>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>Gender Split</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              {Object.entries(genderSplit).map(([gender, percentage]) => (
                <div key={gender} style={{
                  flex: 1,
                  padding: '8px',
                  background: '#f8fafc',
                  borderRadius: '6px',
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: '16px', fontWeight: 600 }}>{(percentage as number).toFixed(0)}%</p>
                  <p style={{ fontSize: '11px', color: '#64748b' }}>{gender}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Cities */}
        {topCities && topCities.length > 0 && (
          <div>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>Top Cities</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {topCities.slice(0, 5).map((city, i) => (
                <span key={i} style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  background: '#f1f5f9',
                }}>
                  {city}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Top Countries */}
        {topCountries && topCountries.length > 0 && (
          <div>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>Top Countries</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {topCountries.slice(0, 5).map((country, i) => (
                <span key={i} style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  background: '#f1f5f9',
                }}>
                  {country}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* No data state */}
        {(!ageDistribution || Object.keys(ageDistribution).length === 0) &&
         (!genderSplit || Object.keys(genderSplit).length === 0) &&
         (!topCities || topCities.length === 0) &&
         (!topCountries || topCountries.length === 0) && (
          <div style={{ textAlign: 'center', padding: '16px', color: '#64748b' }}>
            <p>No demographic data available</p>
          </div>
        )}
      </div>
    </div>
  );
}
