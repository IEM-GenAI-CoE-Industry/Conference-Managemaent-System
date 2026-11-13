
import { useEffect, useState } from 'react';
import api from '../api';

const CONFERENCE_ID = 1;

interface Reviewer {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
}

interface Submission {
  id: number;
  conference_id: number;
  title: string;
  status: string;
}

interface WorkloadItem {
  reviewer_id: number;
  reviewer_name: string;
  assigned_count: number;
  status: string;
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  overloaded: { bg: '#fee2e2', color: '#dc2626' },
  moderate: { bg: '#fef3c7', color: '#d97706' },
  available: { bg: '#d1fae5', color: '#16a34a' },
};

export default function ReviewerWorkloadPage() {
  const [workload, setWorkload] = useState<WorkloadItem[]>([]);
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [suggestion, setSuggestion] = useState<any>(null);

  const [submissionId, setSubmissionId] = useState('');
  const [reviewerId, setReviewerId] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadPageData();
  }, []);

  async function loadPageData() {
    setLoading(true);
    setError('');

    try {
      const [workloadRes, reviewerRes, submissionRes] =
        await Promise.all([
          api.get(`/reviewers/workload?conference_id=${CONFERENCE_ID}`),
          api.get('/users/reviewers'),
          api.get('/submissions/'),
        ]);

      setWorkload(workloadRes.data.reviewers ?? []);

      setReviewers(
        Array.isArray(reviewerRes.data)
          ? reviewerRes.data.filter(
              (reviewer: Reviewer) => reviewer.is_active
            )
          : []
      );

      setSubmissions(
        (Array.isArray(submissionRes.data)
          ? submissionRes.data
          : []
        ).filter(
          (submission: Submission) =>
            submission.conference_id === CONFERENCE_ID
        )
      );
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.detail ||
          'Failed to load reviewer, submission or workload data.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function getSuggestion() {
    setError('');
    setSuccess('');

    try {
      const res = await api.get(
        `/reviewers/workload/suggest?conference_id=${CONFERENCE_ID}`
      );
      setSuggestion(res.data);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          'Failed to get reviewer suggestion.'
      );
    }
  }

  async function handleReassign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!submissionId || !reviewerId) {
      setError('Please select both a submission and a reviewer.');
      return;
    }

    const selectedSubmission = submissions.find(
      (submission) => submission.id === Number(submissionId)
    );

    const selectedReviewer = reviewers.find(
      (reviewer) => reviewer.id === Number(reviewerId)
    );

    if (!selectedSubmission || !selectedReviewer) {
      setError('Invalid submission or reviewer selection.');
      return;
    }

    try {
      await api.patch(
        `/submissions/${submissionId}/reassign?reviewer_id=${reviewerId}`
      );

      setSuccess(
        `"${selectedSubmission.title}" reassigned to ${selectedReviewer.name} successfully.`
      );

      setSubmissionId('');
      setReviewerId('');
      setSuggestion(null);

      await loadPageData();
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          'Reassignment failed. Please try again.'
      );
    }
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Reviewer Workload Balancer</h1>

      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.sectionTitle}>Reviewer Workload</h2>

          <button onClick={getSuggestion} style={styles.button}>
            💡 Suggest Next Reviewer
          </button>
        </div>

        {suggestion && (
          <div style={styles.suggestion}>
            <strong>Suggested Reviewer:</strong>{' '}
            {suggestion.reviewer_name}
            {' '} (ID: {suggestion.recommended_reviewer_id})
            {' '} - Current load: {suggestion.current_load} papers
          </div>
        )}

        {error && <div style={styles.error}>{error}</div>}

        {loading ? (
          <p style={styles.message}>Loading reviewer workload...</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={styles.th}>Reviewer ID</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Assigned Papers</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>

            <tbody>
              {workload.length === 0 ? (
                <tr>
                  <td colSpan={4} style={styles.message}>
                    No reviewer data yet.
                  </td>
                </tr>
              ) : (
                workload.map((reviewer) => {
                  const colors =
                    STATUS_COLORS[reviewer.status] || {};

                  return (
                    <tr
                      key={reviewer.reviewer_id}
                      style={{ borderBottom: '1px solid #e5e7eb' }}
                    >
                      <td style={styles.td}>
                        {reviewer.reviewer_id}
                      </td>

                      <td style={styles.td}>
                        {reviewer.reviewer_name}
                      </td>

                      <td style={styles.td}>
                        {reviewer.assigned_count}
                      </td>

                      <td style={styles.td}>
                        <span
                          style={{
                            ...colors,
                            padding: '4px 12px',
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {reviewer.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>
          Reassign Submission
        </h2>

        {success && (
          <div style={styles.success}>{success}</div>
        )}

        {error && (
          <div style={styles.error}>{error}</div>
        )}

        <form
          onSubmit={handleReassign}
          style={styles.form}
        >
          <div style={styles.field}>
            <label style={styles.label}>
              Select Submission
            </label>

            <select
              value={submissionId}
              onChange={(e) => setSubmissionId(e.target.value)}
              required
              style={styles.input}
            >
              <option value="">Choose a submission</option>

              {submissions.map((submission) => (
                <option
                  key={submission.id}
                  value={submission.id}
                >
                  #{submission.id} - {submission.title}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              Select New Reviewer
            </label>

            <select
              value={reviewerId}
              onChange={(e) => setReviewerId(e.target.value)}
              required
              style={styles.input}
            >
              <option value="">Choose a reviewer</option>

              {reviewers.map((reviewer) => (
                <option
                  key={reviewer.id}
                  value={reviewer.id}
                >
                  {reviewer.name} ({reviewer.email})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            style={styles.button}
            disabled={loading}
          >
            Reassign
          </button>
        </form>

        {!loading && submissions.length === 0 && (
          <p style={styles.message}>
            No submissions available for this conference.
          </p>
        )}

        {!loading && reviewers.length === 0 && (
          <p style={styles.message}>
            No active reviewers available.
          </p>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
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

  header: {
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

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 14,
  },

  th: {
    padding: '10px 14px',
    textAlign: 'left',
    fontSize: 13,
    color: '#374151',
    fontWeight: 600,
  },

  td: {
    padding: '12px 14px',
  },

  form: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    marginTop: 20,
  },

  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    minWidth: 220,
    flex: 1,
  },

  label: {
    fontSize: 14,
    fontWeight: 600,
    color: '#374151',
  },

  input: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 14,
    width: '100%',
    background: '#fff',
    color: '#111827',
  },

  button: {
    padding: '10px 20px',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    height: 42,
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

  suggestion: {
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    color: '#1e40af',
  },

  message: {
    textAlign: 'center',
    padding: 20,
    color: '#6b7280',
  },
};
