import { useEffect, useState } from 'react';
import api from '../api';

const CONFERENCE_ID = 1;

const STATUS_COLORS = {
  overloaded: { bg: '#fee2e2', color: '#dc2626' },
  moderate:   { bg: '#fef3c7', color: '#d97706' },
  available:  { bg: '#d1fae5', color: '#16a34a' },
};

export default function ReviewerWorkloadPage() {
  const [workload, setWorkload] = useState([]);
  const [suggestion, setSuggestion] = useState(null);
  const [submissionId, setSubmissionId] = useState('');
  const [reviewerId, setReviewerId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { loadWorkload(); }, []);

  async function loadWorkload() {
    try {
      const res = await api.get(`/reviewers/workload?conference_id=${CONFERENCE_ID}`);
      setWorkload(res.data);
    } catch (err) {
      setError('Failed to load workload data');
    }
  }

  async function getSuggestion() {
    try {
      const res = await api.get(`/reviewers/workload/suggest?conference_id=${CONFERENCE_ID}`);
      setSuggestion(res.data);
    } catch (err) {
      setError('Failed to get suggestion');
    }
  }

  async function handleReassign(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      await api.patch(`/submissions/${submissionId}/reassign?reviewer_id=${reviewerId}`);
      setSuccess(`Submission ${submissionId} reassigned to reviewer ${reviewerId}`);
      setSubmissionId(''); setReviewerId('');
      loadWorkload();
    } catch (err) {
      setError(err.response?.data?.detail || 'Reassignment failed');
    }
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Reviewer Workload Balancer</h1>

      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={styles.sectionTitle}>Reviewer Workload</h2>
          <button onClick={getSuggestion} style={styles.button}>💡 Suggest Next Reviewer</button>
        </div>

        {suggestion && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 12, marginBottom: 16 }}>
            <strong>Suggested Reviewer:</strong> {suggestion.reviewer_name} (ID: {suggestion.recommended_reviewer_id}) — Current load: {suggestion.current_load} papers
          </div>
        )}

        {error && <div style={styles.error}>{error}</div>}

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
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>No reviewer data yet</td></tr>
            ) : workload.map(r => {
              const colors = STATUS_COLORS[r.status] || {};
              return (
                <tr key={r.reviewer_id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={styles.td}>{r.reviewer_id}</td>
                  <td style={styles.td}>{r.reviewer_name}</td>
                  <td style={styles.td}>{r.assigned_count}</td>
                  <td style={styles.td}>
                    <span style={{ ...colors, padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Reassign Submission</h2>
        {success && <div style={styles.success}>{success}</div>}
        <form onSubmit={handleReassign} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={styles.field}>
            <label>Submission ID</label>
            <input type="number" value={submissionId} onChange={e => setSubmissionId(e.target.value)} required style={styles.input} placeholder="e.g. 1" />
          </div>
          <div style={styles.field}>
            <label>New Reviewer ID</label>
            <input type="number" value={reviewerId} onChange={e => setReviewerId(e.target.value)} required style={styles.input} placeholder="e.g. 3" />
          </div>
          <button type="submit" style={styles.button}>Reassign</button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: 32, background: '#f9fafb', minHeight: '100vh' },
  title: { fontSize: 26, fontWeight: 700, color: '#111827', marginBottom: 24 },
  card: { background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: 600, color: '#374151', margin: 0 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: 13, color: '#374151', fontWeight: 600 },
  td: { padding: '12px 14px' },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  input: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, width: 160 },
  button: { padding: '10px 20px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, height: 42 },
  error: { background: '#fee2e2', color: '#dc2626', padding: 10, borderRadius: 8, marginBottom: 12 },
  success: { background: '#d1fae5', color: '#065f46', padding: 10, borderRadius: 8, marginBottom: 12 },
};