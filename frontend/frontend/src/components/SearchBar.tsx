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
        gap: '8px',
        alignItems: 'center',
        width: '100%',
        maxWidth: '600px'
      }}
    >
      <select
        value={type}
        onChange={(e) => setType(e.target.value as SearchType)}
        style={{
          padding: '8px 12px',
          borderRadius: '6px',
          border: '1px solid #CBD5E1',
          fontSize: '0.875rem',
          backgroundColor: '#FFFFFF',
          outline: 'none',
          color: '#334155',
          fontWeight: 500
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
          padding: '8px 12px',
          borderRadius: '6px',
          border: '1px solid #CBD5E1',
          fontSize: '0.875rem',
          outline: 'none',
          color: '#0F172A'
        }}
      />

      <button
        type="submit"
        style={{
          backgroundColor: '#4F46E5',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '6px',
          padding: '8px 18px',
          fontWeight: 600,
          fontSize: '0.875rem',
          cursor: 'pointer',
          whiteSpace: 'nowrap'
        }}
      >
        Search
      </button>
    </form>
  );
}