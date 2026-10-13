import React, { useState, useEffect } from 'react';
import api from '../api';

interface Paper {
  submission_id: number;
  status: string;
  title?: string;
  abstract?: string;
  deadline?: string | null;
}

interface Review {
  id: number;
  score: number;
  recommendation: string;
  comments: string;
}

const tableHeaderStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: '0.8125rem',
  fontWeight: 700,
  color: '#475569',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
};

const tableCellStyle: React.CSSProperties = {
  padding: '14px 16px',
  color: '#0F172A',
  fontWeight: 600,
};

const formLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: 600,
  color: '#334155',
  marginBottom: '6px',
};

const formInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid #CBD5E1',
  fontSize: '0.875rem',
  outline: 'none',
  boxSizing: 'border-box',
};

export function ReviewsPage() {
  const isOrganizer = localStorage.getItem('role') === 'organizer';

  const [assignedPapers, setAssignedPapers] = useState<Paper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [score, setScore] = useState<number>(5);
  const [recommendation, setRecommendation] = useState<string>('Accept');
  const [comments, setComments] = useState<string>('');
  const [originalityScore, setOriginalityScore] = useState(3);
  const [methodologyScore, setMethodologyScore] = useState(3);
  const [clarityScore, setClarityScore] = useState(3);
  const [significanceScore, setSignificanceScore] = useState(3);
  const [confidenceScore, setConfidenceScore] = useState(3);
  const [confidentialComments, setConfidentialComments] = useState('');
  const [message, setMessage] = useState<string>('');
  const [submissionReviews, setSubmissionReviews] = useState<Review[]>([]);
  const [confidentialReviewComments, setConfidentialReviewComments] = useState<
  { review_id: number; reviewer_id: number; confidential_comments: string | null }[]
>([]);
  const [searchSubmissionId, setSearchSubmissionId] = useState<string>('');

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deadlineFilter, setDeadlineFilter] = useState<string>('all');

  const [coiSubmissionId, setCoiSubmissionId] = useState<string>('');
  const [coiReason, setCoiReason] = useState<string>('');
  const [coiMessage, setCoiMessage] = useState<string>('');

  const [loadingPapers, setLoadingPapers] = useState<boolean>(false);
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [declaringCoi, setDeclaringCoi] = useState<boolean>(false);

  useEffect(() => {
    if (!isOrganizer) {
      void fetchAssignedReviews();
    }
  }, [isOrganizer]);

  const fetchAssignedReviews = async () => {
    setLoadingPapers(true);
    try {
      const res = await api.get('/reviews/mine');
      setAssignedPapers(res.data);
    } catch (err: any) {
      setMessage(
        err.response?.data?.detail || 'Failed to load assigned papers.'
      );
    } finally {
      setLoadingPapers(false);
    }
  };

  const filteredPapers = assignedPapers.filter((paper) => {
    const matchesStatus =
      statusFilter === 'all' ||
      paper.status.toLowerCase() === statusFilter;

    const deadline = paper.deadline ? new Date(paper.deadline) : null;
    const validDeadline =
      deadline !== null && !Number.isNaN(deadline.getTime());

    const overdue =
      validDeadline && deadline.getTime() < Date.now();

    const matchesDeadline =
      deadlineFilter === 'all' ||
      (deadlineFilter === 'overdue' && overdue) ||
      (deadlineFilter === 'upcoming' &&
        validDeadline &&
        !overdue) ||
      (deadlineFilter === 'unset' && !paper.deadline);

    return matchesStatus && matchesDeadline;
  });

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaper || submittingReview) return;

    setSubmittingReview(true);
    setMessage('');

    try {
      await api.post('/reviews/submit', {
      submission_id: selectedPaper.submission_id,
      score,
      recommendation,
      comments,
      originality_score: originalityScore,
      methodology_score: methodologyScore,
      clarity_score: clarityScore,
      significance_score: significanceScore,
      confidence_score: confidenceScore,
      confidential_comments: confidentialComments,
    });

      setMessage('Review submitted successfully!');
      setSelectedPaper(null);
      setComments('');
      setConfidentialComments('');
      await fetchAssignedReviews();
    } catch (err: any) {
      setMessage(
        `Error: ${
          err.response?.data?.detail ||
          err.message ||
          'Could not submit review.'
        }`
      );
    } finally {
      setSubmittingReview(false);
    }
  };

 const fetchReviewsForSubmission = async (subId: string) => {
  if (!subId.trim()) {
    setMessage('Please enter a submission ID.');
    return;
  }

  setMessage('');
  setSubmissionReviews([]);
  setConfidentialReviewComments([]);

  try {
    const res = await api.get(`/reviews/?submission_id=${subId}`);
    setSubmissionReviews(res.data);

    const confidentialRes = await api.get(
      `/reviews/confidential/${subId}`
    );
    setConfidentialReviewComments(confidentialRes.data);

    if (res.data.length === 0) {
      setMessage('No reviews found for this submission.');
    }
  } catch (err: any) {
    setMessage(
      err.response?.data?.detail || 'Failed to fetch submission reviews.'
    );
  }
};
  const declareConflict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (declaringCoi) return;

    const submissionId = Number(coiSubmissionId);

    if (!Number.isInteger(submissionId) || submissionId <= 0) {
      setCoiMessage('Enter a valid submission ID.');
      return;
    }

    setDeclaringCoi(true);
    setCoiMessage('');

    try {
      const res = await api.post('/reviews/coi', {
        submission_id: submissionId,
        reason: coiReason.trim() || null,
      });

      setCoiMessage(
        res.data.message || 'Conflict of interest declared successfully.'
      );
      setCoiSubmissionId('');
      setCoiReason('');
    } catch (err: any) {
      setCoiMessage(
        err.response?.data?.detail ||
          'Could not declare conflict of interest.'
      );
    } finally {
      setDeclaringCoi(false);
    }
  };

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

    switch ((rec || '').toLowerCase()) {
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

  const buttonStyle: React.CSSProperties = {
    backgroundColor: '#4F46E5',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    padding: '9px 14px',
    fontWeight: 600,
    cursor: 'pointer',
  };

  return (
    <div
      style={{
        backgroundColor: '#F8FAFC',
        minHeight: '100vh',
        padding: '32px 24px',
        fontFamily: 'Inter, system-ui, sans-serif',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: '#0F172A',
              margin: 0,
            }}
          >
            Reviewer &amp; Feedback Dashboard
          </h1>
          <p
            style={{
              color: '#64748B',
              fontSize: '0.925rem',
              marginTop: '4px',
            }}
          >
            Review assigned research papers, track deadlines, and declare
            conflicts of interest.
          </p>
        </div>

        {message && (
          <div
            role="status"
            style={{
              padding: '12px 16px',
              backgroundColor: message.startsWith('Error:')
                ? '#FEF2F2'
                : '#ECFDF5',
              border: `1px solid ${
                message.startsWith('Error:') ? '#FECACA' : '#A7F3D0'
              }`,
              color: message.startsWith('Error:') ? '#B91C1C' : '#047857',
              borderRadius: '8px',
              marginBottom: '20px',
              fontWeight: 500,
            }}
          >
            {message}
          </div>
        )}

        {!isOrganizer && (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: selectedPaper
                  ? 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))'
                  : '1fr',
                gap: '24px',
                marginBottom: '32px',
              }}
            >
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                  padding: '24px',
                  overflowX: 'auto',
                }}
              >
                <h3
                  style={{
                    margin: '0 0 16px 0',
                    fontSize: '1.125rem',
                    color: '#0F172A',
                    fontWeight: 600,
                  }}
                >
                  Assigned Papers
                </h3>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '12px',
                    marginBottom: '16px',
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#334155',
                      fontSize: '0.875rem',
                    }}
                  >
                    Status
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      style={{
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#FFFFFF',
                      }}
                    >
                      <option value="all">All statuses</option>
                      <option value="assigned">Assigned</option>
                      <option value="completed">Completed</option>
                    </select>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#334155',
                      fontSize: '0.875rem',
                    }}
                  >
                    Deadline
                    <select
                      value={deadlineFilter}
                      onChange={(e) => setDeadlineFilter(e.target.value)}
                      style={{
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#FFFFFF',
                      }}
                    >
                      <option value="all">All deadlines</option>
                      <option value="upcoming">Upcoming / not overdue</option>
                      <option value="overdue">Overdue</option>
                      <option value="unset">No deadline</option>
                    </select>
                  </label>
                </div>

                {loadingPapers ? (
                  <p style={{ color: '#64748B' }}>Loading assigned papers...</p>
                ) : (
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      textAlign: 'left',
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          backgroundColor: '#F1F5F9',
                          borderBottom: '1px solid #E2E8F0',
                        }}
                      >
                        <th style={tableHeaderStyle}>ID</th>
                        <th style={tableHeaderStyle}>Title</th>
                        <th style={tableHeaderStyle}>Status</th>
                        <th style={tableHeaderStyle}>Deadline</th>
                        <th style={tableHeaderStyle}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPapers.length > 0 ? (
                        filteredPapers.map((paper, index) => {
                          const deadline = paper.deadline
                            ? new Date(paper.deadline)
                            : null;
                          const validDeadline =
                            deadline !== null &&
                            !Number.isNaN(deadline.getTime());
                          const overdue =
                            validDeadline &&
                            deadline.getTime() < Date.now();

                          return (
                            <tr
                              key={`${paper.submission_id}-${index}`}
                              style={{ borderBottom: '1px solid #E2E8F0' }}
                            >
                              <td style={tableCellStyle}>
                                #{paper.submission_id}
                              </td>
                              <td
                                style={{
                                  ...tableCellStyle,
                                  fontWeight: 500,
                                  minWidth: '160px',
                                }}
                              >
                                {paper.title ||
                                  `Submission #${paper.submission_id}`}
                              </td>
                              <td style={tableCellStyle}>
                                <span
                                  style={{
                                    ...getRecommendationBadge(''),
                                    backgroundColor:
                                      paper.status.toLowerCase() === 'completed'
                                        ? '#ECFDF5'
                                        : '#EFF6FF',
                                    color:
                                      paper.status.toLowerCase() === 'completed'
                                        ? '#047857'
                                        : '#1D4ED8',
                                    border:
                                      paper.status.toLowerCase() === 'completed'
                                        ? '1px solid #A7F3D0'
                                        : '1px solid #BFDBFE',
                                  }}
                                >
                                  {paper.status}
                                </span>
                              </td>
                              <td style={tableCellStyle}>
                                {validDeadline ? (
                                  <span
                                    style={{
                                      color: overdue ? '#B91C1C' : '#047857',
                                      fontWeight: 600,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {deadline.toLocaleString()}
                                    {overdue ? ' — OVERDUE' : ''}
                                  </span>
                                ) : (
                                  'Not set'
                                )}
                              </td>
                              <td style={{ padding: '14px 16px' }}>
                                {paper.status.toLowerCase() === 'completed' ? (
                                  <span
                                    style={{
                                      color: '#64748B',
                                      fontSize: '0.875rem',
                                    }}
                                  >
                                    Submitted
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedPaper(paper);
                                      setMessage('');
                                    }}
                                    style={buttonStyle}
                                  >
                                    Review
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={5}
                            style={{
                              padding: '32px',
                              textAlign: 'center',
                              color: '#64748B',
                            }}
                          >
                            No papers match these filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {selectedPaper && (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                    padding: '24px',
                    alignSelf: 'start',
                  }}
                >
                  <h3
                    style={{
                      margin: '0 0 8px 0',
                      fontSize: '1.125rem',
                      color: '#0F172A',
                      fontWeight: 600,
                    }}
                  >
                    Reviewing:{' '}
                    {selectedPaper.title ||
                      `Submission #${selectedPaper.submission_id}`}
                  </h3>

                  <p
                    style={{
                      color: '#64748B',
                      fontSize: '0.875rem',
                      marginBottom: '20px',
                      lineHeight: '1.5',
                    }}
                  >
                    <strong style={{ color: '#334155' }}>Abstract:</strong>{' '}
                    {selectedPaper.abstract || 'No abstract available.'}
                  </p>

                  {selectedPaper.deadline && (
                    <p
                      style={{
                        color: '#B45309',
                        fontSize: '0.875rem',
                        marginBottom: '16px',
                      }}
                    >
                      <strong>Review deadline:</strong>{' '}
                      {new Date(selectedPaper.deadline).toLocaleString()}
                    </p>
                  )}

                  <form
                    onSubmit={handleReviewSubmit}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                    }}
                  >
                    <div>
                      <label htmlFor="review-score" style={formLabelStyle}>
                        Score (1–100):
                      </label>
                      <input
                        id="review-score"
                        type="number"
                        min={1}
                        max={10}
                        value={score}
                        onChange={(e) => setScore(Number(e.target.value))}
                        required
                        style={formInputStyle}
                      />
                    </div>

                    <div>
                      <label htmlFor="review-recommendation" style={formLabelStyle}>
                        Recommendation:
                      </label>
                      <select
                        id="review-recommendation"
                        value={recommendation}
                        onChange={(e) => setRecommendation(e.target.value)}
                        style={{
                          ...formInputStyle,
                          backgroundColor: '#FFFFFF',
                        }}
                      >
                        <option value="Accept">Accept</option>
                        <option value="Reject">Reject</option>
                        <option value="Revision">Revision</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="review-comments" style={formLabelStyle}>
                        Comments:
                      </label>
                      <textarea
                        id="review-comments"
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        required
                        rows={4}
                        style={{
                          ...formInputStyle,
                          resize: 'vertical',
                        }}
                      />
                    </div>

                            {[
          {
            label: 'Originality',
            value: originalityScore,
            setValue: setOriginalityScore,
          },
          {
            label: 'Methodology',
            value: methodologyScore,
            setValue: setMethodologyScore,
          },
          {
            label: 'Clarity',
            value: clarityScore,
            setValue: setClarityScore,
          },
          {
            label: 'Significance',
            value: significanceScore,
            setValue: setSignificanceScore,
          },
          {
            label: 'Reviewer Confidence',
            value: confidenceScore,
            setValue: setConfidenceScore,
          },
        ].map((item) => (
          <div key={item.label}>
            <label
              htmlFor={`rubric-${item.label}`}
              style={formLabelStyle}
            >
              {item.label} (1–5):
            </label>
            <select
              id={`rubric-${item.label}`}
              value={item.value}
              onChange={(e) => item.setValue(Number(e.target.value))}
              required
              style={{
                ...formInputStyle,
                backgroundColor: '#FFFFFF',
              }}
            >
              {[1, 2, 3, 4, 5].map((rating) => (
                <option key={rating} value={rating}>
                  {rating} {rating === 1 ? '— Poor' : rating === 5 ? '— Excellent' : ''}
                </option>
              ))}
            </select>
          </div>
        ))}

            <div>
              <label htmlFor="confidential-comments" style={formLabelStyle}>
                Confidential Comments (organizers only):
              </label>
              <textarea
                id="confidential-comments"
                value={confidentialComments}
                onChange={(e) => setConfidentialComments(e.target.value)}
                rows={3}
                style={{
                  ...formInputStyle,
                  resize: 'vertical',
                }}
              />
            </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: '12px',
                        marginTop: '8px',
                      }}
                    >
                      <button
                        type="submit"
                        disabled={submittingReview}
                        style={{
                          ...buttonStyle,
                          flex: 1,
                          opacity: submittingReview ? 0.6 : 1,
                          cursor: submittingReview ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {submittingReview ? 'Submitting...' : 'Submit Review'}
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
                          fontWeight: 600,
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

            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '32px',
              }}
            >
              <h3 style={{ marginTop: 0, color: '#0F172A' }}>
                Declare Conflict of Interest
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.875rem' }}>
                Declare a conflict for a submission you have a personal,
                professional, or other relevant connection with. This action
                uses the backend COI declaration endpoint.
              </p>

              <form
                onSubmit={declareConflict}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  maxWidth: '600px',
                }}
              >
                <div>
                  <label htmlFor="coi-submission-id" style={formLabelStyle}>
                    Submission ID
                  </label>
                  <input
                    id="coi-submission-id"
                    type="number"
                    min={1}
                    required
                    placeholder="Enter submission ID"
                    value={coiSubmissionId}
                    onChange={(e) => setCoiSubmissionId(e.target.value)}
                    style={formInputStyle}
                  />
                </div>

                <div>
                  <label htmlFor="coi-reason" style={formLabelStyle}>
                    Reason (optional)
                  </label>
                  <textarea
                    id="coi-reason"
                    rows={3}
                    placeholder="Briefly explain the conflict"
                    value={coiReason}
                    onChange={(e) => setCoiReason(e.target.value)}
                    style={formInputStyle}
                  />
                </div>

                <button
                  type="submit"
                  disabled={declaringCoi}
                  style={{
                    ...buttonStyle,
                    alignSelf: 'flex-start',
                    backgroundColor: '#B91C1C',
                    opacity: declaringCoi ? 0.6 : 1,
                    cursor: declaringCoi ? 'not-allowed' : 'pointer',
                  }}
                >
                  {declaringCoi ? 'Submitting...' : 'Declare Conflict'}
                </button>
              </form>

              {coiMessage && (
                <p
                  role="status"
                  style={{
                    color: coiMessage.toLowerCase().includes('could not')
                      ? '#B91C1C'
                      : '#334155',
                    marginBottom: 0,
                  }}
                >
                  {coiMessage}
                </p>
              )}
            </div>
          </>
        )}

        {isOrganizer && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
              padding: '24px',
            }}
          >
            <h2
              style={{
                margin: '0 0 16px 0',
                fontSize: '1.25rem',
                color: '#0F172A',
                fontWeight: 700,
              }}
            >
              Organizer View - Query Submission Reviews
            </h2>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '24px',
                maxWidth: '500px',
              }}
            >
              <input
                type="number"
                min={1}
                placeholder="Enter Submission ID"
                value={searchSubmissionId}
                onChange={(e) => setSearchSubmissionId(e.target.value)}
                style={{ ...formInputStyle, flex: 1, minWidth: '180px' }}
              />
              <button
                type="button"
                onClick={() =>
                  void fetchReviewsForSubmission(searchSubmissionId)
                }
                style={buttonStyle}
              >
                Fetch Reviews
              </button>
            </div>

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
                    <tr
                      style={{
                        backgroundColor: '#F1F5F9',
                        borderBottom: '1px solid #E2E8F0',
                      }}
                    >
                      <th style={tableHeaderStyle}>Review ID</th>
                      <th style={tableHeaderStyle}>Score</th>
                      <th style={tableHeaderStyle}>Recommendation</th>
                      <th style={tableHeaderStyle}>Comments</th>
                      <th style={tableHeaderStyle}>Confidential Comments (Organizer Only)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissionReviews.map((rev) => (
                      <tr
                        key={rev.id}
                        style={{ borderBottom: '1px solid #E2E8F0' }}
                      >
                        <td style={tableCellStyle}>#{rev.id}</td>
                        <td style={tableCellStyle}>{rev.score} / 100</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={getRecommendationBadge(rev.recommendation)}
                          >
                            {rev.recommendation}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: '14px 16px',
                            color: '#475569',
                          }}
                        >
                          {rev.comments}
                        </td>
                        <td style={tableCellStyle}>
                          {confidentialReviewComments.find(
                            (item) => item.review_id === rev.id
                          )?.confidential_comments || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ReviewsPage;
