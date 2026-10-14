
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import api from '../api';

const CONFERENCE_ID = 1;

const STATUS_COLORS = {
  overloaded: { bg: '#fee2e2', color: '#dc2626' },
  moderate: { bg: '#fef3c7', color: '#d97706' },
  available: { bg: '#d1fae5', color: '#16a34a' },
};

export default function ReviewerWorkloadPage() {
  const [workload, setWorkload] = useState([]);
  const [suggestion, setSuggestion] = useState(null);
  const [submissionId, setSubmissionId] = useState('');
  const [reviewerId, setReviewerId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadWorkload();
  }, []);

  async function loadWorkload() {
    setError('');

    try {
      const res = await api.get(
        `/reviewers/workload?conference_id=${CONFERENCE_ID}`
      );
      setWorkload(res.data.reviewers ?? []);
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Failed to load workload data'
      );
    }
  }

  async function getSuggestion() {
    setError('');
    setSuggestion(null);

    try {
      const res = await api.get(
        `/reviewers/workload/suggest?conference_id=${CONFERENCE_ID}`
      );
      setSuggestion(res.data);
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Failed to get reviewer suggestion'
      );
    }
  }

  async function handleReassign(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await api.patch(
        `/submissions/${submissionId}/reassign?reviewer_id=${reviewerId}`
      );

      setSuccess(
        res.data.message ||
          `Submission ${submissionId} reassigned to reviewer ${reviewerId}`
      );

      setSubmissionId('');
      setReviewerId('');

      await loadWorkload();
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Reassignment failed'
      );
    }
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Reviewer Workload Balancer</h1>

      <div style={styles.card}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Reviewer Workload</h2>

          <button onClick={getSuggestion} style={styles.button}>
            💡 Suggest Next Reviewer
          </button>
        </div>

        {suggestion && (
          <div style={styles.suggestion}>
            <strong>
              Suggested Reviewer: {suggestion.reviewer_name}
            </strong>

            <p>Reviewer ID: {suggestion.recommended_reviewer_id}</p>
            <p>
              Current workload: {suggestion.current_load} assigned paper(s)
            </p>
            <p>
              Expertise: {suggestion.expertise || 'Not specified'}
            </p>
            <p>
              Workload status: {suggestion.status}
            </p>
            <p>
              Why this reviewer?{' '}
              {suggestion.reason ||
                'This reviewer currently has the lowest assigned workload.'}
            </p>
          </div>
        )}

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.th}>Reviewer ID</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Assigned Papers</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Expertise</th>
              </tr>
            </thead>

            <tbody>
              {workload.length === 0 ? (
                <tr>
                  <td colSpan={5} style={styles.emptyCell}>
                    No reviewer data yet
                  </td>
                </tr>
              ) : (
                workload.map((r) => {
                  const colors =
                    STATUS_COLORS[r.status] || STATUS_COLORS.available;

                  return (
                    <tr key={r.reviewer_id} style={styles.tableRow}>
                      <td style={styles.td}>{r.reviewer_id}</td>

                      <td style={styles.td}>{r.reviewer_name}</td>

                      <td style={styles.td}>{r.assigned_count}</td>

                      <td style={styles.td}>
                        <span
                          style={{
                            background: colors.bg,
                            color: colors.color,
                            padding: '4px 12px',
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 600,
                            display: 'inline-block',
                          }}
                        >
                          {r.status}
                        </span>
                      </td>

                      <td style={styles.td}>
                        {r.expertise || 'Not specified'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Reassign Submission</h2>

        {success && <div style={styles.success}>{success}</div>}

        <form onSubmit={handleReassign} style={styles.form}>
          <div style={styles.field}>
            <label htmlFor="submissionId">Submission ID</label>
            <input
              id="submissionId"
              type="number"
              min="1"
              value={submissionId}
              onChange={(e) => setSubmissionId(e.target.value)}
              required
              style={styles.input}
              placeholder="e.g. 1"
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="reviewerId">New Reviewer ID</label>
            <input
              id="reviewerId"
              type="number"
              min="1"
              value={reviewerId}
              onChange={(e) => setReviewerId(e.target.value)}
              required
              style={styles.input}
              placeholder="e.g. 3"
            />
          </div>

          <button type="submit" style={styles.button}>
            Reassign
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    padding: 32,
    background: '#f9fafb',
    minHeight: '100vh',
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 24,
  },
  card: {
    background: '#fff',
    borderRadius: 10,
    padding: 24,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    marginBottom: 24,
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#374151',
    margin: 0,
  },
  suggestion: {
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    color: '#1e3a8a',
  },
  tableWrapper: {
    width: '100%',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 14,
  },
  tableHeader: {
    background: '#f3f4f6',
  },
  th: {
    padding: '10px 14px',
    textAlign: 'left',
    fontSize: 13,
    color: '#374151',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '12px 14px',
    color: '#374151',
    borderBottom: '1px solid #e5e7eb',
  },
  tableRow: {
    borderBottom: '1px solid #e5e7eb',
  },
  emptyCell: {
    textAlign: 'center',
    padding: 20,
    color: '#6b7280',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  form: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 14,
    width: 160,
  },
  button: {
    padding: '10px 20px',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    minHeight: 42,
  },
  error: {
    background: '#fee2e2',
    color: '#dc2626',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  success: {
    background: '#d1fae5',
    color: '#065f46',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
};
