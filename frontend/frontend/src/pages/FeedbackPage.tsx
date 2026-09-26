import { useEffect, useState } from 'react';
import api from '../api';

const CONFERENCE_ID = 1;

export default function FeedbackPage() {
  const [sessionId, setSessionId] = useState('1');
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState('');
  const [feedbackList, setFeedbackList] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const role = localStorage.getItem('role');

  useEffect(() => { loadFeedback(); }, []);

  async function loadFeedback() {
    try {
      const res = await api.get(`/feedback/?conference_id=${CONFERENCE_ID}`);
      setFeedbackList(res.data);
      if (role === 'organizer') {
        const sum = await api.get(`/feedback/summary?conference_id=${CONFERENCE_ID}`);
        setSummary(sum.data);
      }
    } catch (err) {
      setError('Failed to load feedback');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      await api.post('/feedback/', { session_id: parseInt(sessionId), rating: parseInt(rating), comments });
      setSuccess('Feedback submitted!');
      setComments('');
      loadFeedback();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit feedback');
    }
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Participant Feedback</h1>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Submit Feedback</h2>
        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}
        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label>Session ID</label>
            <input type="number" value={sessionId} onChange={e => setSessionId(e.target.value)} required style={styles.input} />
          </div>
          <div style={styles.field}>
            <label>Rating (1–5 stars)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[1,2,3,4,5].map(s => (
                <button key={s} type="button" onClick={() => setRating(s)}
                  style={{ ...styles.star, background: s <= rating ? '#f59e0b' : '#e5e7eb', color: s <= rating ? '#fff' : '#374151' }}>
                  ★ {s}
                </button>
              ))}
            </div>
          </div>
          <div style={styles.field}>
            <label>Comments</label>
            <textarea value={comments} onChange={e => setComments(e.target.value)} rows={3} style={styles.input} />
          </div>
          <button type="submit" style={styles.button}>Submit Feedback</button>
        </form>
      </div>

      {summary && (
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Feedback Summary (Organizer View)</h2>
          <p><strong>Overall Average:</strong> {summary.overall_avg_rating}/5</p>
          <table style={styles.table}>
            <thead><tr><th>Session ID</th><th>Avg Rating</th><th>Responses</th></tr></thead>
            <tbody>
              {summary.per_session.map(s => (
                <tr key={s.session_id}>
                  <td>{s.session_id}</td>
                  <td>{s.avg_rating}</td>
                  <td>{s.total_responses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>All Feedback</h2>
        {feedbackList.length === 0 ? <p style={{ color: '#6b7280' }}>No feedback yet.</p> : (
          <table style={styles.table}>
            <thead><tr><th>Session</th><th>Rating</th><th>Comments</th><th>Date</th></tr></thead>
            <tbody>
              {feedbackList.map(f => (
                <tr key={f.id}>
                  <td>{f.session_id}</td>
                  <td>{'★'.repeat(f.rating)}</td>
                  <td>{f.comments || '—'}</td>
                  <td>{new Date(f.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { padding: 32, background: '#f9fafb', minHeight: '100vh' },
  title: { fontSize: 26, fontWeight: 700, color: '#111827', marginBottom: 24 },
  card: { background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 16 },
  field: { marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 },
  input: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 },
  button: { padding: '10px 24px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 },
  star: { padding: '6px 12px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  error: { background: '#fee2e2', color: '#dc2626', padding: 10, borderRadius: 8, marginBottom: 12 },
  success: { background: '#d1fae5', color: '#065f46', padding: 10, borderRadius: 8, marginBottom: 12 },
};