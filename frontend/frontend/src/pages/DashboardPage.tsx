import { useEffect, useState } from 'react';
import api from '../api';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [role, setRole] = useState<string | null>(localStorage.getItem('role'));

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    const currentRole = localStorage.getItem('role');
    setRole(currentRole);

    if (currentRole !== 'organizer') {
      setStats(null);
      setError('This dashboard is available to organizers. Use your organizer account to view event reporting and workload metrics.');
      return;
    }

    try {
      const res = await api.get('/dashboard/stats?conference_id=1');
      setStats(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load dashboard');
    }
  }

  const workload = stats?.reviewer_workload_summary;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.kicker}>Command center</div>
          <h1 style={styles.title}>Organizer Dashboard</h1>
        </div>
        <button onClick={loadStats} style={styles.refresh}>↻ Refresh</button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {stats && (
        <>
          <section>
            <h2 style={styles.sectionTitle}>Conference Stats</h2>
            <div style={styles.grid}>
              <StatCard label="Conferences" value={stats.total_conferences} color="#7c3aed" />
              <StatCard label="Sessions" value={stats.total_sessions} color="#38bdf8" />
              <StatCard label="Registrations" value={stats.total_registrations} color="#2dd4bf" />
              <StatCard label="Revenue" value={stats.total_revenue !== undefined ? `₹${stats.total_revenue}` : '-'} color="#f59e0b" />
              <StatCard label="Submissions" value={stats.total_submissions} color="#a78bfa" />
              <StatCard label="Accepted" value={stats.submissions_accepted} color="#34d399" />
              <StatCard label="Rejected" value={stats.submissions_rejected} color="#f87171" />
              <StatCard label="Certificates" value={stats.total_certificates} color="#fbbf24" />
              <StatCard label="Feedback Count" value={stats.total_feedback} color="#60a5fa" />
              <StatCard label="Satisfaction Avg" value={stats.satisfaction_avg ? `${stats.satisfaction_avg}/5` : '-'} color="#f472b6" />
            </div>
          </section>

          {workload && (
            <section style={{ marginTop: 32 }}>
              <h2 style={styles.sectionTitle}>Reviewer Workload Summary</h2>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <Chip label={`Overloaded: ${workload.overloaded}`} color="#fecaca" bg="rgba(239, 68, 68, 0.16)" />
                <Chip label={`Moderate: ${workload.moderate}`} color="#fde68a" bg="rgba(245, 158, 11, 0.16)" />
                <Chip label={`Available: ${workload.available}`} color="#bbf7d0" bg="rgba(34, 197, 94, 0.16)" />
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
    <div style={{
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.8))',
      borderRadius: 18,
      padding: '22px 22px 18px',
      boxShadow: '0 16px 32px rgba(15, 23, 42, 0.3)',
      border: '1px solid rgba(148, 163, 184, 0.18)',
      borderLeft: `4px solid ${color}`
    }}>
      <div style={{ fontSize: 12, color: '#a5b4cf', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#f8fafc' }}>{value ?? '-'}</div>
    </div>
  );
}

function Chip({ label, color, bg }) {
  return <span style={{ background: bg, color, padding: '9px 16px', borderRadius: 999, fontWeight: 700, fontSize: 14, border: '1px solid rgba(148, 163, 184, 0.18)' }}>{label}</span>;
}

const styles = {
  page: { padding: 32, background: 'radial-gradient(circle at top, rgba(124,58,237,0.18), transparent 20%), linear-gradient(135deg, rgba(2,6,23,0.7), rgba(15,23,42,0.26))', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 16 },
  kicker: { fontSize: 12, fontWeight: 800, color: '#93c5fd', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 },
  title: { fontSize: 32, fontWeight: 800, color: '#f8fafc', margin: 0 },
  refresh: { padding: '10px 18px', background: 'linear-gradient(135deg, #7c3aed, #38bdf8)', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 800, boxShadow: '0 12px 24px rgba(124,58,237,0.32)' },
  sectionTitle: { fontSize: 18, fontWeight: 700, color: '#f8fafc', marginBottom: 16 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 },
  error: { background: 'rgba(127, 29, 29, 0.25)', color: '#fecaca', border: '1px solid rgba(248, 113, 113, 0.2)', padding: 12, borderRadius: 12, marginBottom: 16 },
};