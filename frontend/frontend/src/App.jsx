import { useEffect, useState } from 'react'
import './App.css'

const API = 'http://127.0.0.1:8000'

function App() {
  const [token, setToken] = useState('')
  const [stats, setStats] = useState(null)
  const [forecast, setForecast] = useState(null)
  const [rooms, setRooms] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [error, setError] = useState('')

  async function api(path, options = {}) {
    const res = await fetch(`${API}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || 'Request failed')
    return data
  }

  async function loadDashboard(authToken = token) {
    try {
      setError('')
      const headers = { Authorization: `Bearer ${authToken}` }
      const get = async (path) => {
        const r = await fetch(`${API}${path}`, { headers })
        const d = await r.json()
        if (!r.ok) throw new Error(d.detail || 'Request failed')
        return d
      }
      setStats(await get('/dashboard/stats?conference_id=1'))
      setForecast(await get('/resources/forecast?conference_id=1'))
      setRooms(await get('/rooms/utilization?conference_id=1'))
      setAlerts(await get('/bottlenecks?conference_id=1'))
    } catch (e) { setError(e.message) }
  }

  async function demoLogin() {
    try {
      setError('')
      const res = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'organizer@demo.com', password: 'demo123' }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Login failed')
      setToken(data.access_token)
      await loadDashboard(data.access_token)
    } catch (e) { setError(e.message) }
  }

  useEffect(() => { demoLogin() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">CONFERENCE MANAGEMENT SYSTEM</p>
          <h1>Organizer Control Center</h1>
          <p className="subtitle">A working prototype for registration, scheduling, attendance and conference operations intelligence.</p>
        </div>
        <button onClick={() => loadDashboard()} className="refresh">Refresh</button>
      </header>

      {error && <div className="error">{error}</div>}

      {stats && <section className="cards">
        <Card label="Registrations" value={stats.total_registrations} />
        <Card label="Revenue" value={`₹${stats.total_revenue}`} />
        <Card label="Sessions" value={stats.total_sessions} />
        <Card label="Satisfaction" value={stats.satisfaction_avg ? `${stats.satisfaction_avg}/5` : '—'} />
      </section>}

      <section className="grid">
        <Panel title="Attendance-Based Resource Forecasting">
          {forecast ? <div className="metrics"><Metric label="Expected attendance" value={forecast.expected_attendance}/><Metric label="Seats" value={forecast.recommended_seats}/><Metric label="Meals" value={forecast.recommended_meals}/><Metric label="Badges" value={forecast.recommended_badges}/></div> : <Loading/>}
          {forecast?.alert && <div className="warning">⚠ {forecast.alert}</div>}
        </Panel>

        <Panel title="Live Bottlenecks">
          {alerts.length ? alerts.map((a, i) => <div className={`alert ${a.severity}`} key={i}><b>{a.severity.toUpperCase()}</b><span>{a.message}</span></div>) : <div className="success">✓ No active bottlenecks</div>}
        </Panel>

        <Panel title="Room Utilization Optimizer">
          {rooms ? rooms.sessions.map(s => <div className="room" key={s.session_id}><div><b>{s.session_title}</b><small>{s.room} · capacity {s.room_capacity}</small></div><span className={`pill ${s.status}`}>{s.utilization_pct}% · {s.status}</span></div>) : <Loading/>}
        </Panel>

        <Panel title="Prototype Coverage">
          <ul className="coverage"><li>✓ Authentication & profiles</li><li>✓ Conference & session management</li><li>✓ Registration & payment tracking</li><li>✓ Attendance & feedback</li><li>✓ Sponsor & exhibitor management</li><li>✓ Resource forecasting</li><li>✓ Bottleneck detection</li><li>✓ Room utilization optimization</li><li>⏳ Submissions, reviews & certificates — Swapna's module</li></ul>
        </Panel>
      </section>
    </main>
  )
}

function Card({ label, value }) { return <div className="card"><span>{label}</span><strong>{value}</strong></div> }
function Metric({ label, value }) { return <div><span>{label}</span><strong>{value}</strong></div> }
function Panel({ title, children }) { return <section className="panel"><h2>{title}</h2>{children}</section> }
function Loading() { return <p className="muted">Loading…</p> }

export default App
