import { useEffect, useState } from 'react';
import api from '../api';

const initialForm = {
  name: '',
  email: '',
  password: '',
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    try {
      const res = await api.get('/auth/profile');
      setProfile(res.data);
      setForm({
        name: res.data.name ?? '',
        email: res.data.email ?? '',
        password: '',
      });
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to load your profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    try {
      const payload: Record<string, string> = {};
      if (form.name.trim() && form.name.trim() !== profile?.name) payload.name = form.name.trim();
      if (form.email.trim() && form.email.trim().toLowerCase() !== profile?.email?.toLowerCase()) payload.email = form.email.trim().toLowerCase();
      if (form.password.trim()) payload.password = form.password.trim();

      if (Object.keys(payload).length === 0) {
        setSuccess('No changes to save.');
        return;
      }

      const res = await api.patch('/auth/profile', payload);
      setProfile(res.data);
      setForm({ name: res.data.name ?? '', email: res.data.email ?? '', password: '' });
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update profile.');
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.kicker}>Account</div>
          <h1 style={styles.title}>My Profile</h1>
        </div>
      </div>

      {error && <div style={styles.error} role="alert">{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      {loading ? (
        <div style={styles.loading}>Loading profile…</div>
      ) : profile ? (
        <div style={styles.grid}>
          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Profile Details</h2>
            <div style={styles.metaGrid}>
              <div><span style={styles.label}>Name</span><strong>{profile.name}</strong></div>
              <div><span style={styles.label}>Email</span><strong>{profile.email}</strong></div>
              <div><span style={styles.label}>Role</span><strong>{profile.role}</strong></div>
              <div><span style={styles.label}>Status</span><strong>{profile.is_active ? 'Active' : 'Inactive'}</strong></div>
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Update Profile</h2>
            <form onSubmit={handleSubmit} style={styles.form}>
              <label style={styles.labelBlock}>
                Name
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={styles.input} />
              </label>

              <label style={styles.labelBlock}>
                Email
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={styles.input} />
              </label>

              <label style={styles.labelBlock}>
                New Password
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={styles.input} placeholder="Leave blank to keep current password" />
              </label>

              <button type="submit" style={styles.button}>Save Changes</button>
            </form>
          </section>
        </div>
      ) : (
        <section style={styles.card}>
          <p style={styles.empty}>Your profile could not be loaded. Check your connection and try again.</p>
          <button type="button" style={styles.button} onClick={() => { setLoading(true); loadProfile(); }}>Retry</button>
        </section>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: 32,
    minHeight: '100vh',
    background: 'radial-gradient(circle at top, rgba(59,130,246,0.18), transparent 25%), linear-gradient(135deg, rgba(2,6,23,0.66), rgba(15,23,42,0.24))',
  },
  header: { marginBottom: 22 },
  kicker: { fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#93c5fd', fontWeight: 800 },
  title: { margin: '10px 0 0', fontSize: 32, color: '#f8fafc' },
  grid: { display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' },
  card: {
    background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.8))',
    border: '1px solid rgba(148,163,184,0.18)',
    borderRadius: 18,
    padding: 20,
    boxShadow: '0 16px 32px rgba(15,23,42,0.28)',
  },
  sectionTitle: { margin: '0 0 18px', color: '#f8fafc', fontSize: 20 },
  metaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 18 },
  label: { display: 'block', fontSize: 12, color: '#93c5fd', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  labelBlock: { display: 'flex', flexDirection: 'column', gap: 8, color: '#e2e8f0', fontWeight: 600 },
  input: {
    border: '1px solid rgba(148,163,184,0.18)',
    background: 'rgba(15,23,42,0.7)',
    color: '#f8fafc',
    borderRadius: 12,
    padding: '12px 14px',
    fontSize: 15,
  },
  button: {
    marginTop: 8,
    border: 'none',
    borderRadius: 12,
    background: 'linear-gradient(135deg, #2563eb, #8b5cf6)',
    color: '#fff',
    padding: '12px 16px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  loading: { color: '#cbd5e1', fontSize: 16 },
  empty: { color: '#cbd5e1', marginTop: 0 },
  error: { background: 'rgba(127,29,29,0.26)', color: '#fecaca', border: '1px solid rgba(248,113,113,0.2)', padding: 12, borderRadius: 12, marginBottom: 16 },
  success: { background: 'rgba(20,83,45,0.28)', color: '#bbf7d0', border: '1px solid rgba(34,197,94,0.25)', padding: 12, borderRadius: 12, marginBottom: 16 },
};
