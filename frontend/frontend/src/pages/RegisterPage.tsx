import { useState } from 'react';
import api from '../api';

const ROLES = ['organizer', 'participant', 'author', 'reviewer', 'speaker'];

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'participant' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/auth/register', form);
      setSuccess('Registered successfully! Redirecting to login...');
      setTimeout(() => window.location.href = '/login', 1500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Conference Management System</h2>
        <h3 style={styles.subtitle}>Create Account</h3>
        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}
        <form onSubmit={handleRegister}>
          {['name', 'email', 'password'].map(field => (
            <div key={field} style={styles.field}>
              <label style={styles.label}>{field.charAt(0).toUpperCase() + field.slice(1)}</label>
              <input
                name={field}
                type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                value={form[field]}
                onChange={handleChange}
                required
                style={styles.input}
              />
            </div>
          ))}
          <div style={styles.field}>
            <label style={styles.label}>Role</label>
            <select name="role" value={form.role} onChange={handleChange} style={styles.input}>
              {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
          </div>
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <p style={{ marginTop: 16, textAlign: 'center' }}>
          Already have an account?{' '}
          <a href="/login" style={{ color: '#4f46e5' }}>Login</a>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' },
  card: { background: '#fff', padding: 40, borderRadius: 12, width: 400, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' },
  title: { textAlign: 'center', fontSize: 18, color: '#4f46e5', marginBottom: 4 },
  subtitle: { textAlign: 'center', marginBottom: 24, color: '#111' },
  field: { marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 14, color: '#374151', textTransform: 'capitalize' },
  input: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 },
  button: { width: '100%', padding: 12, background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, cursor: 'pointer', marginTop: 8 },
  error: { background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 },
  success: { background: '#d1fae5', color: '#065f46', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 },
};