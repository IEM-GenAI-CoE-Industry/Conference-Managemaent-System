import { useEffect, useState } from 'react';
import api from '../api';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    try {
      const res = await api.get('/dashboard/stats?conference_id=1');
      setStats(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load dashboard');
    }
  }

  const workload = stats?.reviewer_workload_summary;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Organizer Dashboard</h1>
        <button onClick={loadStats} style={styles.refresh}>↻ Refresh</button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {stats && (
        <>
          <section>
            <h2 style={styles.sectionTitle}>Conference Stats</h2>
            <div style={styles.grid}>
              <StatCard label="Conferences" value={stats.total_conferences} color="#4f46e5" />
              <StatCard label="Sessions" value={stats.total_sessions} color="#0891b2" />
              <StatCard label="Registrations" value={stats.total_registrations} color="#059669" />
              <StatCard label="Revenue" value={stats.total_revenue !== undefined ? `₹${stats.total_revenue}` : '—'} color="#d97706" />
              <StatCard label="Submissions" value={stats.total_submissions} color="#7c3aed" />
              <StatCard label="Accepted" value={stats.submissions_accepted} color="#16a34a" />
              <StatCard label="Rejected" value={stats.submissions_rejected} color="#dc2626" />
              <StatCard label="Certificates" value={stats.total_certificates} color="#ca8a04" />
              <StatCard label="Feedback Count" value={stats.total_feedback} color="#0284c7" />
              <StatCard label="Satisfaction Avg" value={stats.satisfaction_avg ? `${stats.satisfaction_avg}/5` : '—'} color="#db2777" />
            </div>
          </section>

          {workload && (
            <section style={{ marginTop: 32 }}>
              <h2 style={styles.sectionTitle}>Reviewer Workload Summary</h2>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <Chip label={`Overloaded: ${workload.overloaded}`} color="#dc2626" bg="#fee2e2" />
                <Chip label={`Moderate: ${workload.moderate}`} color="#d97706" bg="#fef3c7" />
                <Chip label={`Available: ${workload.available}`} color="#16a34a" bg="#d1fae5" />
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{value ?? '—'}</div>
    </div>
  );
}

function Chip({ label, color, bg }) {
  return <span style={{ background: bg, color, padding: '8px 16px', borderRadius: 20, fontWeight: 600, fontSize: 14 }}>{label}</span>;
}

const styles = {
  page: { padding: 32, background: '#f9fafb', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 26, fontWeight: 700, color: '#111827' },
  refresh: { padding: '8px 20px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 16 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 },
  error: { background: '#fee2e2', color: '#dc2626', padding: 12, borderRadius: 8, marginBottom: 16 },
};