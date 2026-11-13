
import React, { useState, useEffect } from 'react';
import api from '../api';

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

interface Reviewer {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
}

export default function OrganizerSubmissionPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [reviewersLoading, setReviewersLoading] = useState<boolean>(true);

  const [reviewerSelections, setReviewerSelections] =
    useState<Record<number, string>>({});

  const [assigning, setAssigning] = useState<number | null>(null);

  const fetchAllSubmissions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/submissions/');
      setSubmissions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
      alert('Failed to load submissions.');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviewers = async () => {
    try {
      setReviewersLoading(true);

      const res = await api.get('/users/reviewers');

      const activeReviewers = Array.isArray(res.data)
        ? res.data.filter((reviewer: Reviewer) => reviewer.is_active)
        : [];

      setReviewers(activeReviewers);
    } catch (err: any) {
      console.error('Failed to fetch reviewers:', err);
      alert(
        err.response?.data?.detail ||
        'Could not load reviewers. Please check organizer access.'
      );
    } finally {
      setReviewersLoading(false);
    }
  };

  useEffect(() => {
    fetchAllSubmissions();
    fetchReviewers();
  }, []);

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await api.patch(`/submissions/${id}/status`, {
        status: newStatus
      });

      await fetchAllSubmissions();
    } catch (err: any) {
      alert(
        err.response?.data?.detail ||
        err.message ||
        'Error updating status'
      );
    }
  };

  const getReviewerLabel = (reviewer: Reviewer) => {
    return `${reviewer.name} — ${reviewer.email} (ID: ${reviewer.id})`;
  };

  const assignReviewer = async (submissionId: number) => {
    const selectedLabel = reviewerSelections[submissionId];

    const selectedReviewer = reviewers.find(
      (reviewer) => getReviewerLabel(reviewer) === selectedLabel
    );

    if (!selectedReviewer) {
      alert('Please select a reviewer from the suggestions.');
      return;
    }

    try {
      setAssigning(submissionId);

      await api.post('/reviews/assign', {
        submission_id: submissionId,
        reviewer_id: selectedReviewer.id
      });

      await api.patch(`/submissions/${submissionId}/status`, {
        status: 'under_review'
      });

      alert(`Reviewer ${selectedReviewer.name} assigned successfully!`);

      setReviewerSelections((previous) => ({
        ...previous,
        [submissionId]: ''
      }));

      await fetchAllSubmissions();
    } catch (err: any) {
      alert(
        err.response?.data?.detail ||
        'Failed to assign reviewer'
      );
    } finally {
      setAssigning(null);
    }
  };

  const getStatusBadgeStyle = (
    status: string
  ): React.CSSProperties => {
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
        return {
          ...base,
          backgroundColor: '#ECFDF5',
          color: '#047857',
          border: '1px solid #A7F3D0'
        };

      case 'rejected':
        return {
          ...base,
          backgroundColor: '#FEF2F2',
          color: '#B91C1C',
          border: '1px solid #FECACA'
        };

      case 'camera_ready_submitted':
        return {
          ...base,
          backgroundColor: '#F3E8FF',
          color: '#6B21A8',
          border: '1px solid #DDD6FE'
        };

      case 'under_review':
        return {
          ...base,
          backgroundColor: '#FEF3C7',
          color: '#B45309',
          border: '1px solid #FDE68A'
        };

      default:
        return {
          ...base,
          backgroundColor: '#EFF6FF',
          color: '#1D4ED8',
          border: '1px solid #BFDBFE'
        };
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#F8FAFC',
        minHeight: '100vh',
        padding: '32px 24px',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Header Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '28px',
            gap: '16px',
            flexWrap: 'wrap'
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: '#0F172A',
                margin: 0
              }}
            >
              Organizer - Submissions Management
            </h1>

            <p
              style={{
                color: '#64748B',
                fontSize: '0.925rem',
                marginTop: '4px'
              }}
            >
              Review paper status, monitor camera-ready uploads,
              and update decision state.
            </p>
          </div>

          <button
            onClick={() => {
              fetchAllSubmissions();
              fetchReviewers();
            }}
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
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            overflowX: 'auto'
          }}
        >
          {loading ? (
            <div
              style={{
                padding: '48px',
                textAlign: 'center',
                color: '#64748B'
              }}
            >
              Loading submissions...
            </div>
          ) : (
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                minWidth: '850px'
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: '#F1F5F9',
                    borderBottom: '1px solid #E2E8F0'
                  }}
                >
                  <th style={headerStyle}>ID</th>
                  <th style={headerStyle}>Title</th>
                  <th style={headerStyle}>Author ID</th>
                  <th style={headerStyle}>Status</th>
                  <th style={headerStyle}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {submissions.length > 0 ? (
                  submissions.map((sub) => {
                    const datalistId = `reviewers-${sub.id}`;

                    return (
                      <tr
                        key={sub.id}
                        style={{
                          borderBottom: '1px solid #E2E8F0'
                        }}
                      >
                        <td style={cellStyle}>
                          #{sub.id}
                        </td>

                        <td
                          style={{
                            ...cellStyle,
                            fontWeight: 500
                          }}
                        >
                          {sub.title}
                        </td>

                        <td
                          style={{
                            ...cellStyle,
                            color: '#64748B'
                          }}
                        >
                          User {sub.author_id}
                        </td>

                        <td style={cellStyle}>
                          <span style={getStatusBadgeStyle(sub.status)}>
                            {sub.status
                              ? sub.status.replace(/_/g, ' ')
                              : 'Submitted'}
                          </span>
                        </td>

                        <td style={cellStyle}>
                          {/* Status Selector */}
                          <select
                            value={sub.status || 'submitted'}
                            onChange={(e) =>
                              handleStatusChange(sub.id, e.target.value)
                            }
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: '#0F172A',
                              fontSize: '0.875rem',
                              fontWeight: 500,
                              cursor: 'pointer',
                              width: '100%'
                            }}
                          >
                            <option value="submitted">Submitted</option>
                            <option value="under_review">Under Review</option>
                            <option value="accepted">Accepted</option>
                            <option value="rejected">Rejected</option>
                            <option value="camera_ready_submitted">
                              Camera-Ready Submitted
                            </option>
                            <option value="final_accepted">
                              Final Accepted
                            </option>
                          </select>

                          {/* Searchable Reviewer Dropdown */}
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '7px',
                              marginTop: '10px',
                              minWidth: '230px'
                            }}
                          >
                            <input
                              type="text"
                              list={datalistId}
                              value={reviewerSelections[sub.id] || ''}
                              onChange={(e) =>
                                setReviewerSelections((previous) => ({
                                  ...previous,
                                  [sub.id]: e.target.value
                                }))
                              }
                              placeholder={
                                reviewersLoading
                                  ? 'Loading reviewers...'
                                  : 'Search reviewer by name...'
                              }
                              disabled={reviewersLoading || reviewers.length === 0}
                              style={{
                                padding: '8px 10px',
                                border: '1px solid #CBD5E1',
                                borderRadius: '6px',
                                width: '100%',
                                boxSizing: 'border-box',
                                fontSize: '0.85rem'
                              }}
                            />

                            <datalist id={datalistId}>
                              {reviewers.map((reviewer) => (
                                <option
                                  key={reviewer.id}
                                  value={getReviewerLabel(reviewer)}
                                />
                              ))}
                            </datalist>

                            <button
                              type="button"
                              onClick={() => assignReviewer(sub.id)}
                              disabled={
                                assigning === sub.id ||
                                reviewersLoading ||
                                reviewers.length === 0
                              }
                              style={{
                                padding: '8px 12px',
                                border: 'none',
                                borderRadius: '6px',
                                backgroundColor: '#0F766E',
                                color: '#FFFFFF',
                                cursor: 'pointer',
                                fontWeight: 600,
                                opacity:
                                  assigning === sub.id ||
                                  reviewersLoading ||
                                  reviewers.length === 0
                                    ? 0.6
                                    : 1
                              }}
                            >
                              {assigning === sub.id
                                ? 'Assigning...'
                                : 'Assign Reviewer'}
                            </button>

                            {!reviewersLoading && reviewers.length === 0 && (
                              <small style={{ color: '#DC2626' }}>
                                No active reviewers available.
                              </small>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        padding: '48px',
                        textAlign: 'center',
                        color: '#64748B'
                      }}
                    >
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

const headerStyle: React.CSSProperties = {
  padding: '14px 20px',
  fontSize: '0.8125rem',
  fontWeight: 700,
  color: '#475569',
  textTransform: 'uppercase'
};

const cellStyle: React.CSSProperties = {
  padding: '16px 20px',
  color: '#0F172A'
};
