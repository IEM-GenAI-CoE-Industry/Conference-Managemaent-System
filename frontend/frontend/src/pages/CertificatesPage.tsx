import { useEffect, useState } from 'react';
import api from '../api';

const CONFERENCE_ID = 1;

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState([]);
  const [verifyUUID, setVerifyUUID] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { loadCertificates(); }, []);

  async function loadCertificates() {
    try {
      const res = await api.get('/certificates/me');
      setCertificates(res.data);
    } catch (err) {
      setError('Failed to load certificates');
    }
  }

  async function handleGenerate() {
    setError(''); setSuccess('');
    try {
      await api.post('/certificates/generate', { conference_id: CONFERENCE_ID });
      setSuccess('Certificate generated!');
      loadCertificates();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate certificate');
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setVerifyResult(null); setError('');
    try {
      const res = await api.get(`/certificates/verify/${verifyUUID}`);
      setVerifyResult(res.data);
    } catch (err) {
      setError('Certificate not found or invalid UUID');
    }
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Certificates</h1>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Generate Certificate</h2>
        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}
        <p style={{ color: '#6b7280', marginBottom: 16, fontSize: 14 }}>
          Generate a certificate for your attendance at conference #{CONFERENCE_ID}
        </p>
        <button onClick={handleGenerate} style={styles.button}>🎓 Generate Certificate</button>
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>My Certificates</h2>
        {certificates.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No certificates yet. Generate one above!</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Conference ID</th>
                <th style={styles.th}>UUID</th>
                <th style={styles.th}>Issued At</th>
              </tr>
            </thead>
            <tbody>
              {certificates.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={styles.td}>{c.id}</td>
                  <td style={styles.td}>{c.conference_id}</td>
                  <td style={styles.td}>
                    <code style={{ fontSize: 11, background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>
                      {c.certificate_uuid}
                    </code>
                  </td>
                  <td style={styles.td}>{new Date(c.issued_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Verify Certificate (Public)</h2>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 16 }}>No login required — anyone can verify a certificate using its UUID.</p>
        <form onSubmit={handleVerify} style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 14, display: 'block', marginBottom: 6 }}>Certificate UUID</label>
            <input
              value={verifyUUID}
              onChange={e => setVerifyUUID(e.target.value)}
              required
              style={{ ...styles.input, width: '100%' }}
              placeholder="Paste UUID here..."
            />
          </div>
          <button type="submit" style={styles.button}>Verify</button>
        </form>
        {verifyResult && (
          <div style={{ marginTop: 16, background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 8, padding: 16 }}>
            <p style={{ color: '#065f46', fontWeight: 600, marginBottom: 8 }}>✓ Valid Certificate</p>
            <p style={{ fontSize: 14, color: '#065f46' }}>User ID: {verifyResult.user_id}</p>
            <p style={{ fontSize: 14, color: '#065f46' }}>Conference ID: {verifyResult.conference_id}</p>
            <p style={{ fontSize: 14, color: '#065f46' }}>Issued: {new Date(verifyResult.issued_at).toLocaleDateString()}</p>
          </div>
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
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: 13, fontWeight: 600 },
  td: { padding: '12px 14px' },
  input: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 },
  button: { padding: '10px 20px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 },
  error: { background: '#fee2e2', color: '#dc2626', padding: 10, borderRadius: 8, marginBottom: 12 },
  success: { background: '#d1fae5', color: '#065f46', padding: 10, borderRadius: 8, marginBottom: 12 },
};