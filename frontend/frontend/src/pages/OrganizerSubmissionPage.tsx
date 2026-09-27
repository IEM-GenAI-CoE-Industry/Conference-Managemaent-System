import React, { useState, useEffect } from 'react';

const API = 'http://127.0.0.1:8000';

interface Submission {
  id: number;
  conference_id: number;
  author_id: number;
  title: string;
  abstract: string;
  file_url?: string;
  status: string;
  camera_ready_file_url?: string;
  notes?: string;
}

export default function OrganizerSubmissionPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAllSubmissions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API}/submissions/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSubmissions(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllSubmissions();
  }, []);

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API}/submissions/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update submission status');
      fetchAllSubmissions();
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    }
  };

  const getStatusBadgeStyle = (status: string): React.CSSProperties => {
    const base: React.CSSProperties = {
      padding: '4px 10px',
      borderRadius: '9999px',
      fontSize: '0.8125rem',
      fontWeight: 600,
      display: 'inline-block',
      textTransform: 'capitalize'
    };

    switch (status) {
      case 'accepted':
      case 'final_accepted':
        return { ...base, backgroundColor: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0' };
      case 'rejected':
        return { ...base, backgroundColor: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' };
      case 'camera_ready_submitted':
        return { ...base, backgroundColor: '#F3E8FF', color: '#6B21A8', border: '1px solid #DDD6FE' };
      case 'under_review':
        return { ...base, backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A' };
      default:
        return { ...base, backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' };
    }
  };

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', padding: '32px 24px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Organizer — Submissions Management
            </h1>
            <p style={{ color: '#64748B', fontSize: '0.925rem', marginTop: '4px' }}>
              Review paper status, monitor camera-ready uploads, and update decision state.
            </p>
          </div>
          <button
            onClick={fetchAllSubmissions}
            style={{
              backgroundColor: '#4F46E5',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 18px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)'
            }}
          >
            Refresh Data
          </button>
        </div>

        {/* Submissions Table Card */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden'
        }}>
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
              Loading submissions...
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '14px 20px', fontSize: '0.8125rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>ID</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.8125rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Title</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.8125rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Author ID</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.8125rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.8125rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {submissions && submissions.length > 0 ? (
                  submissions.map((sub) => (
                    <tr key={sub.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '16px 20px', color: '#0F172A', fontWeight: 600 }}>#{sub.id}</td>
                      <td style={{ padding: '16px 20px', color: '#0F172A', fontWeight: 500 }}>{sub.title}</td>
                      <td style={{ padding: '16px 20px', color: '#64748B' }}>User {sub.author_id}</td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={getStatusBadgeStyle(sub.status)}>
                          {sub.status ? sub.status.replace(/_/g, ' ') : 'Submitted'}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <select
                          value={sub.status || 'submitted'}
                          onChange={(e) => handleStatusChange(sub.id, e.target.value)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            backgroundColor: '#FFFFFF',
                            color: '#0F172A',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            outline: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="submitted">Submitted</option>
                          <option value="under_review">Under Review</option>
                          <option value="accepted">Accepted</option>
                          <option value="rejected">Rejected</option>
                          <option value="camera_ready_submitted">Camera-Ready Submitted</option>
                          <option value="final_accepted">Final Accepted</option>
                        </select>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
                      No submissions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}