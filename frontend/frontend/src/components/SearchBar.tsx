import React, { useState } from 'react';

export type SearchType = 'Conference' | 'Session' | 'Speaker';

interface SearchBarProps {
  onSearch?: (query: string, type: SearchType) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState<string>('');
  const [type, setType] = useState<SearchType>('Conference');

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (onSearch) {
      onSearch(query, type);
    } else {
      window.location.href = `/search?q=${encodeURIComponent(query)}&type=${encodeURIComponent(type)}`;
    }
  };

  return (
    <form
      onSubmit={handleSearch}
      style={{
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        width: '100%',
        maxWidth: '700px',
        padding: '10px 12px',
        borderRadius: '18px',
        background: 'rgba(15, 23, 42, 0.7)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.32)',
        backdropFilter: 'blur(10px)'
      }}
    >
      <select
        value={type}
        onChange={(e) => setType(e.target.value as SearchType)}
        style={{
          padding: '10px 12px',
          borderRadius: '12px',
          border: '1px solid rgba(148, 163, 184, 0.18)',
          fontSize: '0.875rem',
          background: 'rgba(15, 23, 42, 0.85)',
          outline: 'none',
          color: '#e2e8f0',
          fontWeight: 700,
          cursor: 'pointer'
        }}
      >
        <option value="Conference">Conference</option>
        <option value="Session">Session</option>
        <option value="Speaker">Speaker</option>
      </select>

      <input
        type="text"
        placeholder="Search directory..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          flex: 1,
          padding: '11px 14px',
          borderRadius: '12px',
          border: '1px solid rgba(148, 163, 184, 0.15)',
          fontSize: '0.9rem',
          outline: 'none',
          color: '#f8fafc',
          background: 'rgba(15, 23, 42, 0.68)'
        }}
      />

      <button
        type="submit"
        style={{
          background: 'linear-gradient(135deg, #38bdf8 0%, #8b5cf6 100%)',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '12px',
          padding: '10px 18px',
          fontWeight: 800,
          fontSize: '0.875rem',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          boxShadow: '0 10px 20px rgba(59, 130, 246, 0.25)'
        }}
      >
        Search
      </button>
    </form>
  );
}