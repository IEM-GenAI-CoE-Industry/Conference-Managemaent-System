import { useEffect, useState } from 'react';
import api from '../api';


export default function FeedbackPage() {
  const [sessionId, setSessionId] = useState('');
  const [conferenceId, setConferenceId] = useState(localStorage.getItem('selected_conference_id') || '');
  const [sessions, setSessions] = useState([]);
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState('');
  const [feedbackList, setFeedbackList] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [summaryError, setSummaryError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const role = localStorage.getItem('role');

  useEffect(() => { if (conferenceId) { loadFeedback(); loadSessions(); } }, [conferenceId]);

  async function loadSessions() {
    try { const res = await api.get('/sessions/'); const rows = Array.isArray(res.data) ? res.data : (res.data?.sessions ?? []); setSessions(rows.filter(s => !conferenceId || String(s.conference_id) === String(conferenceId))); }
    catch (err) { setError(err.response?.data?.detail || err.message || 'Unable to load sessions.'); }
  }

  async function loadFeedback() {
    setLoading(true);
    setError('');
    setSummaryError('');
    try {
      const res = await api.get(`/feedback/?conference_id=${Number(conferenceId)}`);
      setFeedbackList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to load feedback');
      setLoading(false);
      return;
    }

    if (role === 'organizer') {
      try {
        const sum = await api.get(`/feedback/summary?conference_id=${Number(conferenceId)}`);
        setSummary(sum.data);
      } catch (err) {
        setSummary(null);
        setSummaryError(err.response?.data?.detail || err.message || 'Organizer summary is unavailable.');
      }
    }
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      await api.post('/feedback/', { session_id: Number(sessionId), rating, comments });
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
        {summaryError && <div style={styles.error}>{summaryError}</div>}
        {success && <div style={styles.success}>{success}</div>}
        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label>Conference</label>
            <select value={conferenceId} onChange={e => { setConferenceId(e.target.value); localStorage.setItem('selected_conference_id', e.target.value); }} required style={styles.input}>
              <option value="">Choose a conference</option>
              {Array.from(new Map(sessions.map(s => [String(s.conference_id), s])).values()).map(s => <option key={s.conference_id} value={s.conference_id}>Conference #{s.conference_id}</option>)}
            </select>
          </div>
          <div style={styles.field}>
            <label>Session</label>
            <select value={sessionId} onChange={e => setSessionId(e.target.value)} required style={styles.input}>
              <option value="">Choose an attended session</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.title || `Session #${s.id}`}</option>)}
            </select>
          </div>
          <div style={styles.field}>
            <label>Rating (1-5 stars)</label>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <h2 style={styles.sectionTitle}>All Feedback</h2>
          <button type="button" onClick={loadFeedback} disabled={loading} style={styles.button}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        {error ? <p style={{ color: '#6b7280' }}>Feedback could not be loaded. Check the message above and retry.</p> : loading && feedbackList.length === 0 ? <p style={{ color: '#6b7280' }}>Loading feedback...</p> : feedbackList.length === 0 ? <p style={{ color: '#6b7280' }}>No feedback yet.</p> : (
          <table style={styles.table}>
            <thead><tr><th>Session</th><th>Rating</th><th>Comments</th><th>Date</th></tr></thead>
            <tbody>
              {feedbackList.map(f => (
                <tr key={f.id}>
                  <td>{f.session_id}</td>
                  <td>{'★'.repeat(f.rating)}</td>
                  <td>{f.comments || '-'}</td>
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
  page: { padding: 32, background: 'transparent', minHeight: '100vh', color: '#e2e8f0' },
  title: { fontSize: 26, fontWeight: 700, color: '#f8fafc', marginBottom: 24 },
  card: { background: 'linear-gradient(145deg, rgba(15,23,42,0.96), rgba(30,41,59,0.88))', color: '#e2e8f0', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.18)', marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 16 },
  field: { marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 },
  input: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 },
  button: { padding: '10px 24px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 },
  star: { padding: '6px 12px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  error: { background: '#fee2e2', color: '#dc2626', padding: 10, borderRadius: 8, marginBottom: 12 },
  success: { background: '#d1fae5', color: '#065f46', padding: 10, borderRadius: 8, marginBottom: 12 },
};