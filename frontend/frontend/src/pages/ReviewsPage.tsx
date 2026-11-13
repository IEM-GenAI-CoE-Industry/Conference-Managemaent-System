
import React, { useState, useEffect } from 'react';
import api from '../api';

interface Paper {
  submission_id: number;
  status: string;
  title?: string;
  abstract?: string;
}

interface SubmissionOption {
  id: number;
  title: string;
  abstract?: string;
  status: string;
}

interface Review {
  id: number;
  score: number;
  recommendation: string;
  comments: string;
}

export function ReviewsPage() {
  const isOrganizer = localStorage.getItem('role') === 'organizer';

  const [assignedPapers, setAssignedPapers] = useState<Paper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);

  const [score, setScore] = useState<number>(5);
  const [recommendation, setRecommendation] = useState<string>('Accept');
  const [comments, setComments] = useState<string>('');

  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const [submissionReviews, setSubmissionReviews] = useState<Review[]>([]);

  // Organizer submission selector
  const [availableSubmissions, setAvailableSubmissions] =
    useState<SubmissionOption[]>([]);
  const [submissionSearch, setSubmissionSearch] = useState('');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState('');
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => {
    if (isOrganizer) {
      fetchAvailableSubmissions();
    } else {
      fetchAssignedReviews();
    }
  }, []);

  const fetchAvailableSubmissions = async () => {
    try {
      setLoadingSubmissions(true);
      const res = await api.get('/submissions/');
      setAvailableSubmissions(
        Array.isArray(res.data) ? res.data : []
      );
    } catch (err: any) {
      console.error(err);
      setMessage(
        err.response?.data?.detail || 'Unable to load submissions.'
      );
      setMessageType('error');
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const fetchAssignedReviews = async () => {
    try {
      const res = await api.get('/reviews/mine');
      setAssignedPapers(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      console.error(err);
      setMessage(
        err.response?.data?.detail || 'Unable to load assigned papers.'
      );
      setMessageType('error');
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPaper) return;

    try {
      await api.post('/reviews/submit', {
        submission_id: selectedPaper.submission_id,
        score,
        recommendation,
        comments,
      });

      setMessage('Review submitted successfully!');
      setMessageType('success');
      setSelectedPaper(null);
      setComments('');
      fetchAssignedReviews();
    } catch (err: any) {
      setMessage(
        err.response?.data?.detail || 'Unable to submit review.'
      );
      setMessageType('error');
    }
  };

  const fetchReviewsForSubmission = async () => {
    if (!selectedSubmissionId) {
      setMessage('Please select a submission first.');
      setMessageType('error');
      return;
    }

    try {
      setLoadingReviews(true);
      setMessage('');

      const res = await api.get(
        `/reviews/?submission_id=${selectedSubmissionId}`
      );

      setSubmissionReviews(
        Array.isArray(res.data) ? res.data : []
      );
    } catch (err: any) {
      console.error(err);
      setSubmissionReviews([]);
      setMessage(
        err.response?.data?.detail || 'Unable to fetch reviews.'
      );
      setMessageType('error');
    } finally {
      setLoadingReviews(false);
    }
  };

  const filteredSubmissions = availableSubmissions.filter((submission) => {
    const search = submissionSearch.trim().toLowerCase();

    if (!search) return true;

    return (
      String(submission.id).includes(search) ||
      submission.title.toLowerCase().includes(search) ||
      (submission.abstract || '').toLowerCase().includes(search)
    );
  });

  const getRecommendationBadge = (
    rec: string
  ): React.CSSProperties => {
    const base: React.CSSProperties = {
      padding: '4px 10px',
      borderRadius: '9999px',
      fontSize: '0.8125rem',
      fontWeight: 600,
      display: 'inline-block',
    };

    switch (rec.toLowerCase()) {
      case 'accept':
        return {
          ...base,
          backgroundColor: '#ECFDF5',
          color: '#047857',
          border: '1px solid #A7F3D0',
        };

      case 'reject':
        return {
          ...base,
          backgroundColor: '#FEF2F2',
          color: '#B91C1C',
          border: '1px solid #FECACA',
        };

      default:
        return {
          ...base,
          backgroundColor: '#FEF3C7',
          color: '#B45309',
          border: '1px solid #FDE68A',
        };
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #CBD5E1',
    fontSize: '0.875rem',
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    outline: 'none',
  };

  return (
    <div
      style={{
        backgroundColor: '#F8FAFC',
        minHeight: '100vh',
        padding: '32px 24px',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: '#0F172A',
              margin: 0,
            }}
          >
            Reviewer & Feedback Dashboard
          </h1>

          <p
            style={{
              color: '#64748B',
              fontSize: '0.925rem',
              marginTop: '4px',
            }}
          >
            Submit scores and feedback on assigned research papers,
            or query existing reviews.
          </p>
        </div>

        {/* Success / Error Message */}
        {message && (
          <div
            role="alert"
            style={{
              padding: '12px 16px',
              backgroundColor:
                messageType === 'success' ? '#ECFDF5' : '#FEF2F2',
              border: `1px solid ${
                messageType === 'success' ? '#A7F3D0' : '#FECACA'
              }`,
              color:
                messageType === 'success' ? '#047857' : '#B91C1C',
              borderRadius: '8px',
              marginBottom: '20px',
              fontWeight: 500,
            }}
          >
            {message}
          </div>
        )}

        {/* Reviewer Section */}
        {!isOrganizer && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: selectedPaper ? '1fr 1fr' : '1fr',
              gap: '24px',
              marginBottom: '40px',
            }}
          >
            {/* Assigned Papers */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '24px',
              }}
            >
              <h3
                style={{
                  margin: '0 0 16px',
                  fontSize: '1.125rem',
                  color: '#0F172A',
                  fontWeight: 600,
                }}
              >
                Assigned Papers
              </h3>

              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  textAlign: 'left',
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#F1F5F9' }}>
                    <th style={{ padding: '12px 16px' }}>ID</th>
                    <th style={{ padding: '12px 16px' }}>Title</th>
                    <th style={{ padding: '12px 16px' }}>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {assignedPapers.length > 0 ? (
                    assignedPapers.map((paper) => (
                      <tr
                        key={paper.submission_id}
                        style={{ borderBottom: '1px solid #E2E8F0' }}
                      >
                        <td style={{ padding: '14px 16px' }}>
                          #{paper.submission_id}
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          {paper.title ||
                            `Submission #${paper.submission_id}`}
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <button
                            onClick={() => setSelectedPaper(paper)}
                            style={{
                              backgroundColor: '#4F46E5',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '6px 14px',
                              cursor: 'pointer',
                            }}
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={3}
                        style={{
                          padding: '32px',
                          textAlign: 'center',
                          color: '#64748B',
                        }}
                      >
                        No papers assigned for review.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Review Form */}
            {selectedPaper && (
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '24px',
                }}
              >
                <h3
                  style={{
                    margin: '0 0 8px',
                    fontSize: '1.125rem',
                    color: '#0F172A',
                  }}
                >
                  Reviewing: {selectedPaper.title}
                </h3>

                <p
                  style={{
                    color: '#64748B',
                    fontSize: '0.875rem',
                    marginBottom: '20px',
                  }}
                >
                  <strong>Abstract:</strong> {selectedPaper.abstract}
                </p>

                <form
                  onSubmit={handleReviewSubmit}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  <label>
                    Score (1-10):
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={score}
                      onChange={(e) =>
                        setScore(Number(e.target.value))
                      }
                      required
                      style={inputStyle}
                    />
                  </label>

                  <label>
                    Recommendation:
                    <select
                      value={recommendation}
                      onChange={(e) =>
                        setRecommendation(e.target.value)
                      }
                      style={inputStyle}
                    >
                      <option value="Accept">Accept</option>
                      <option value="Reject">Reject</option>
                      <option value="Revision">Revision</option>
                    </select>
                  </label>

                  <label>
                    Comments:
                    <textarea
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      required
                      rows={4}
                      style={inputStyle}
                    />
                  </label>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      type="submit"
                      style={{
                        backgroundColor: '#4F46E5',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '10px 18px',
                        cursor: 'pointer',
                        flex: 1,
                      }}
                    >
                      Submit Review
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedPaper(null)}
                      style={{
                        backgroundColor: '#F1F5F9',
                        color: '#475569',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        padding: '10px 18px',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Organizer Section */}
        {isOrganizer && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '24px',
            }}
          >
            <h2
              style={{
                margin: '0 0 16px',
                fontSize: '1.25rem',
                color: '#0F172A',
                fontWeight: 700,
              }}
            >
              Organizer View - Query Submission Reviews
            </h2>

            {/* Searchable Submission Selector */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginBottom: '24px',
                maxWidth: '500px',
              }}
            >
              <label
                htmlFor="submission-search"
                style={{ fontWeight: 600, color: '#334155' }}
              >
                Search submission by title or ID
              </label>

              <input
                id="submission-search"
                type="text"
                placeholder="Search submission title or ID..."
                value={submissionSearch}
                onChange={(e) => setSubmissionSearch(e.target.value)}
                style={inputStyle}
              />

              <label
                htmlFor="submission-select"
                style={{ fontWeight: 600, color: '#334155' }}
              >
                Select Submission
              </label>

              <select
                id="submission-select"
                value={selectedSubmissionId}
                onChange={(e) => {
                  setSelectedSubmissionId(e.target.value);
                  setSubmissionReviews([]);
                }}
                style={inputStyle}
                disabled={loadingSubmissions}
              >
                <option value="">
                  {loadingSubmissions
                    ? 'Loading submissions...'
                    : 'Choose a submission'}
                </option>

                {filteredSubmissions.map((submission) => (
                  <option
                    key={submission.id}
                    value={submission.id}
                  >
                    #{submission.id} - {submission.title}
                  </option>
                ))}
              </select>

              {!loadingSubmissions &&
                availableSubmissions.length === 0 && (
                  <p style={{ color: '#64748B', margin: 0 }}>
                    No submissions found.
                  </p>
                )}

              {!loadingSubmissions &&
                availableSubmissions.length > 0 &&
                filteredSubmissions.length === 0 && (
                  <p style={{ color: '#B91C1C', margin: 0 }}>
                    No matching submissions found.
                  </p>
                )}

              <button
                type="button"
                onClick={fetchReviewsForSubmission}
                disabled={!selectedSubmissionId || loadingReviews}
                style={{
                  backgroundColor: '#4F46E5',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 16px',
                  fontWeight: 600,
                  cursor: selectedSubmissionId ? 'pointer' : 'not-allowed',
                  opacity: selectedSubmissionId ? 1 : 0.6,
                  width: 'fit-content',
                }}
              >
                {loadingReviews ? 'Loading Reviews...' : 'Fetch Reviews'}
              </button>
            </div>

            {/* Reviews Table */}
            {submissionReviews.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'left',
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: '#F1F5F9' }}>
                      <th style={{ padding: '12px 16px' }}>Review ID</th>
                      <th style={{ padding: '12px 16px' }}>Score</th>
                      <th style={{ padding: '12px 16px' }}>
                        Recommendation
                      </th>
                      <th style={{ padding: '12px 16px' }}>Comments</th>
                    </tr>
                  </thead>

                  <tbody>
                    {submissionReviews.map((rev) => (
                      <tr
                        key={rev.id}
                        style={{ borderBottom: '1px solid #E2E8F0' }}
                      >
                        <td style={{ padding: '14px 16px' }}>
                          #{rev.id}
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          {rev.score} / 10
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={getRecommendationBadge(
                              rev.recommendation
                            )}
                          >
                            {rev.recommendation}
                          </span>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          {rev.comments}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loadingReviews &&
              selectedSubmissionId &&
              submissionReviews.length === 0 && (
                <p style={{ color: '#64748B' }}>
                  No reviews found for this submission, or reviews
                  have not been fetched yet.
                </p>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
