import React, { useState } from 'react';
import { SearchBar, SearchType } from '../components/SearchBar';

const API = 'http://127.0.0.1:8000';

interface SearchResult {
  id: number | string;
  type: string;
  title: string;
  subtitle?: string;
  description?: string;
}

export function SearchPage() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const executeSearch = async (q: string, type: SearchType) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/search?q=${encodeURIComponent(q)}&type=${encodeURIComponent(type)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getTypeBadgeStyle = (typeStr: string): React.CSSProperties => {
    return {
      fontSize: '0.75rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      padding: '2px 8px',
      borderRadius: '9999px',
      display: 'inline-block',
      backgroundColor: '#EFF6FF',
      color: '#1D4ED8',
      border: '1px solid #BFDBFE'
    };
  };

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', padding: '32px 24px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header Section */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Search Directory
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.925rem', marginTop: '4px' }}>
            Find conferences, sessions, and speakers across the platform.
          </p>
        </div>

        {/* Search Bar Container Card */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: '20px', marginBottom: '32px' }}>
          <SearchBar onSearch={executeSearch} />
        </div>

        {loading && (
          <p style={{ color: '#64748B', fontWeight: 500, fontSize: '0.925rem' }}>Loading results...</p>
        )}

        {/* Grid Container for Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {results.length > 0 ? (
            results.map((item) => (
              <div
                key={item.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div>
                  <span style={getTypeBadgeStyle(item.type)}>{item.type}</span>
                </div>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '1.125rem', color: '#0F172A', fontWeight: 600 }}>{item.title}</h3>
                {item.subtitle && (
                  <p style={{ color: '#64748B', fontSize: '0.875rem', margin: 0, fontWeight: 500 }}>
                    {item.subtitle}
                  </p>
                )}
                {item.description && (
                  <p style={{ color: '#334155', fontSize: '0.875rem', margin: '4px 0 0 0', lineHeight: '1.5' }}>
                    {item.description}
                  </p>
                )}
              </div>
            ))
          ) : (
            !loading && (
              <div style={{ color: '#64748B', fontSize: '0.875rem', gridColumn: '1 / -1' }}>
                No search results to display. Enter a query above to search.
              </div>
            )
          )}
        </div>

      </div>
    </div>
  );
}