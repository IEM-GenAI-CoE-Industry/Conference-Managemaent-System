import { useEffect, useState } from 'react';
import './App.css';

import { SubmissionsPage } from './pages/SubmissionsPage';
import OrganizerSubmissionPage from './pages/OrganizerSubmissionPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { SearchPage } from './pages/SearchPage';

const API = 'http://127.0.0.1:8000';

type Tab = 'dashboard' | 'submissions' | 'organizer' | 'reviews' | 'search';

function Dashboard({ stats, forecast, rooms, alerts, error, loadDashboard }: any) {
  return (
    <main className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">CONFERENCE MANAGEMENT SYSTEM</p>
          <h1>Organizer Control Center</h1>
          <p className="subtitle">
            A working prototype for registration, scheduling, attendance and conference operations intelligence.
          </p>
        </div>
        <button onClick={() => loadDashboard()} className="refresh">Refresh</button>
      </header>

      {error && <div className="error">{error}</div>}

      {stats && (
        <section className="cards">
          <Card label="Registrations" value={stats.total_registrations} />
          <Card label="Revenue" value={`₹${stats.total_revenue}`} />
          <Card label="Sessions" value={stats.total_sessions} />
          <Card label="Satisfaction" value={stats.satisfaction_avg ? `${stats.satisfaction_avg}/5` : '—'} />
        </section>
      )}

      <section className="grid">
        <Panel title="Attendance-Based Resource Forecasting">
          {forecast ? (
            <div className="metrics">
              <Metric label="Expected attendance" value={forecast.expected_attendance} />
              <Metric label="Seats" value={forecast.recommended_seats} />
              <Metric label="Meals" value={forecast.recommended_meals} />
              <Metric label="Badges" value={forecast.recommended_badges} />
            </div>
          ) : (
            <Loading />
          )}
          {forecast?.alert && <div className="warning">⚠ {forecast.alert}</div>}
        </Panel>

        <Panel title="Live Bottlenecks">
          {alerts.length ? (
            alerts.map((a: any, i: number) => (
              <div className={`alert ${a.severity}`} key={i}>
                <b>{a.severity.toUpperCase()}</b>
                <span>{a.message}</span>
              </div>
            ))
          ) : (
            <div className="success">✓ No active bottlenecks</div>
          )}
        </Panel>

        <Panel title="Room Utilization Optimizer">
          {rooms ? (
            rooms.sessions.map((s: any) => (
              <div className="room" key={s.session_id}>
                <div>
                  <b>{s.session_title}</b>
                  <small>{s.room} · capacity {s.room_capacity}</small>
                </div>
                <span className={`pill ${s.status}`}>{s.utilization_pct}% · {s.status}</span>
              </div>
            ))
          ) : (
            <Loading />
          )}
        </Panel>

        <Panel title="Prototype Coverage">
          <ul className="coverage">
            <li>✓ Authentication & profiles</li>
            <li>✓ Conference & session management</li>
            <li>✓ Registration & payment tracking</li>
            <li>✓ Attendance & feedback</li>
            <li>✓ Sponsor & exhibitor management</li>
            <li>✓ Resource forecasting</li>
            <li>✓ Bottleneck detection</li>
            <li>✓ Room utilization optimization</li>
            <li>✓ Submissions, reviews & search modules integrated</li>
          </ul>
        </Panel>
      </section>
    </main>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [token, setToken] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [rooms, setRooms] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [error, setError] = useState('');

  async function loadDashboard(authToken = token) {
    try {
      setError('');
      const headers = { Authorization: `Bearer ${authToken}` };
      const get = async (path: string) => {
        const r = await fetch(`${API}${path}`, { headers });
        const d = await r.json();
        if (!r.ok) throw new Error(d.detail || 'Request failed');
        return d;
      };
      setStats(await get('/dashboard/stats?conference_id=1'));
      setForecast(await get('/resources/forecast?conference_id=1'));
      setRooms(await get('/rooms/utilization?conference_id=1'));
      setAlerts(await get('/bottlenecks?conference_id=1'));
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function demoLogin() {
    try {
      setError('');
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'organizer@demo.com', password: 'demo123' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Login failed');
      setToken(data.access_token);
      localStorage.setItem('token', data.access_token);
      await loadDashboard(data.access_token);
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    demoLogin();
  }, []);

  const navItemStyle = (tab: Tab): React.CSSProperties => ({
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: activeTab === tab ? '#4F46E5' : 'transparent',
    color: activeTab === tab ? '#FFFFFF' : '#64748B',
    fontWeight: 600,
    fontSize: '0.875rem',
    cursor: 'pointer'
  });

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Top Global Navigation */}
      <nav style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{ fontWeight: 700, fontSize: '1.125rem', color: '#0F172A' }}>
          CMS Portal
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={navItemStyle('dashboard')} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
          <button style={navItemStyle('submissions')} onClick={() => setActiveTab('submissions')}>Author Submissions</button>
          <button style={navItemStyle('organizer')} onClick={() => setActiveTab('organizer')}>Organizer Submissions</button>
          <button style={navItemStyle('reviews')} onClick={() => setActiveTab('reviews')}>Peer Reviews</button>
          <button style={navItemStyle('search')} onClick={() => setActiveTab('search')}>Directory Search</button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div>
        {activeTab === 'dashboard' && (
          <Dashboard
            token={token}
            stats={stats}
            forecast={forecast}
            rooms={rooms}
            alerts={alerts}
            error={error}
            loadDashboard={loadDashboard}
          />
        )}
        {activeTab === 'submissions' && <SubmissionsPage />}
        {activeTab === 'organizer' && <OrganizerSubmissionPage />}
        {activeTab === 'reviews' && <ReviewsPage />}
        {activeTab === 'search' && <SearchPage />}
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: any }) { return <div className="card"><span>{label}</span><strong>{value}</strong></div>; }
function Metric({ label, value }: { label: string; value: any }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="panel"><h2>{title}</h2>{children}</section>; }
function Loading() { return <p className="muted">Loading…</p>; }

export default App;