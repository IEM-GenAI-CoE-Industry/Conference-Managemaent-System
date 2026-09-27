import React, { useState, useEffect } from 'react';

const API = 'http://127.0.0.1:8000';

interface Paper {
  submission_id: number;
  title: string;
  abstract: string;
}

interface Review {
  id: number;
  score: number;
  recommendation: string;
  comments: string;
}

export function ReviewsPage() {
  const [assignedPapers, setAssignedPapers] = useState<Paper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [score, setScore] = useState<number>(5);
  const [recommendation, setRecommendation] = useState<string>('Accept');
  const [comments, setComments] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [submissionReviews, setSubmissionReviews] = useState<Review[]>([]);
  const [searchSubmissionId, setSearchSubmissionId] = useState<string>('');

  useEffect(() => {
    fetchAssignedReviews();
  }, []);

  const fetchAssignedReviews = async () => {
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API}/reviews/?reviewer_id=me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAssignedPapers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaper) return;
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API}/reviews/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          submission_id: selectedPaper.submission_id,
          score,
          recommendation,
          comments,
        })
      });
      if (!res.ok) throw new Error('Failed to submit review');
      setMessage('Review submitted successfully!');
      setSelectedPaper(null);
      setComments('');
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const fetchReviewsForSubmission = async (subId: string) => {
    if (!subId) return;
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API}/reviews/?submission_id=${subId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSubmissionReviews(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getRecommendationBadge = (rec: string): React.CSSProperties => {
    const base: React.CSSProperties = {
      padding: '4px 10px',
      borderRadius: '9999px',
      fontSize: '0.8125rem',
      fontWeight: 600,
      display: 'inline-block'
    };
    switch (rec.toLowerCase()) {
      case 'accept':
        return { ...base, backgroundColor: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0' };
      case 'reject':
        return { ...base, backgroundColor: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' };
      default:
        return { ...base, backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A' };
    }
  };

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', padding: '32px 24px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Reviewer & Feedback Dashboard
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.925rem', marginTop: '4px' }}>
            Submit scores and feedback on assigned research papers, or query existing reviews.
          </p>
        </div>

        {message && (
          <div style={{ padding: '12px 16px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', borderRadius: '8px', marginBottom: '20px', fontWeight: 500 }}>
            {message}
          </div>
        )}

        {/* Top Grid: Assigned Papers + Form Side-by-Side */}
        <div style={{ display: 'grid', gridTemplateColumns: selectedPaper ? '1fr 1fr' : '1fr', gap: '24px', marginBottom: '40px' }}>
          
          {/* Table Card */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.125rem', color: '#0F172A', fontWeight: 600 }}>Assigned Papers</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '12px 16px', fontSize: '0.8125rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>ID</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.8125rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Title</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.8125rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {assignedPapers.length > 0 ? (
                  assignedPapers.map((paper) => (
                    <tr key={paper.submission_id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '14px 16px', color: '#0F172A', fontWeight: 600 }}>#{paper.submission_id}</td>
                      <td style={{ padding: '14px 16px', color: '#0F172A', fontWeight: 500 }}>{paper.title}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <button
                          onClick={() => setSelectedPaper(paper)}
                          style={{ backgroundColor: '#4F46E5', color: '#FFFFFF', border: 'none', borderRadius: '6px', padding: '6px 14px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                      No papers assigned for review.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Form Card */}
          {selectedPaper && (
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: '24px' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.125rem', color: '#0F172A', fontWeight: 600 }}>
                Reviewing: {selectedPaper.title}
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.875rem', marginBottom: '20px', lineHeight: '1.5' }}>
                <strong style={{ color: '#334155' }}>Abstract:</strong> {selectedPaper.abstract}
              </p>

              <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Score (1–10):</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={score}
                    onChange={(e) => setScore(Number(e.target.value))}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.875rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Recommendation:</label>
                  <select
                    value={recommendation}
                    onChange={(e) => setRecommendation(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.875rem', backgroundColor: '#FFF', outline: 'none' }}
                  >
                    <option value="Accept">Accept</option>
                    <option value="Reject">Reject</option>
                    <option value="Revision">Revision</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Comments:</label>
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    required
                    rows={4}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.875rem', outline: 'none', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button
                    type="submit"
                    style={{ backgroundColor: '#4F46E5', color: '#FFFFFF', border: 'none', borderRadius: '6px', padding: '10px 18px', fontWeight: 600, cursor: 'pointer', flex: 1 }}
                  >
                    Submit Review
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPaper(null)}
                    style={{ backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '10px 18px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Bottom Section: Organizer Query Section */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: '24px' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '1.25rem', color: '#0F172A', fontWeight: 700 }}>
            Organizer View — Query Submission Reviews
          </h2>
          
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', maxWidth: '400px' }}>
            <input
              type="number"
              placeholder="Enter Submission ID"
              value={searchSubmissionId}
              onChange={(e) => setSearchSubmissionId(e.target.value)}
              style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.875rem', outline: 'none' }}
            />
            <button
              onClick={() => fetchReviewsForSubmission(searchSubmissionId)}
              style={{ backgroundColor: '#4F46E5', color: '#FFFFFF', border: 'none', borderRadius: '6px', padding: '8px 16px', fontWeight: 600, cursor: 'pointer' }}
            >
              Fetch Reviews
            </button>
          </div>

          {submissionReviews.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '12px 16px', fontSize: '0.8125rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Review ID</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.8125rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Score</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.8125rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Recommendation</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.8125rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Comments</th>
                </tr>
              </thead>
              <tbody>
                {submissionReviews.map((rev) => (
                  <tr key={rev.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '14px 16px', color: '#0F172A', fontWeight: 600 }}>#{rev.id}</td>
                    <td style={{ padding: '14px 16px', color: '#0F172A', fontWeight: 600 }}>{rev.score} / 10</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={getRecommendationBadge(rev.recommendation)}>{rev.recommendation}</span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#475569' }}>{rev.comments}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}