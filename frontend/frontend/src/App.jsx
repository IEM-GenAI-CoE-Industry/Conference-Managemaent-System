import { useEffect, useState } from "react";
import "./App.css";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import ConferencesPage from "./pages/ConferencesPage";
import RoomUtilizationPage from "./pages/RoomUtilizationPage";
import SessionsPage from "./pages/SessionsPage";

const API = "http://127.0.0.1:8000";
const routes = {
  dashboard: "Dashboard",
  conferences: "Conferences",
  sessions: "Sessions",
  rooms: "Rooms",
  announcements: "Announcements",
};

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [rooms, setRooms] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      setError("");
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const get = async (path) => {
        const response = await fetch(`${API}${path}`, { headers });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Request failed");
        return data;
      };
      const [dashboardData, forecastData, roomData, bottleneckData] = await Promise.all([
        get("/dashboard/stats?conference_id=1"),
        get("/resources/forecast?conference_id=1"),
        get("/rooms/utilization?conference_id=1"),
        get("/bottlenecks?conference_id=1"),
      ]);
      setStats(dashboardData);
      setForecast(forecastData);
      setRooms(roomData);
      setAlerts(bottleneckData);
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }

  useEffect(() => { loadDashboard(); }, []);

  return <>
    <div className="page-heading"><div><p className="eyebrow">ORGANIZER CONTROL CENTER</p><h1>Conference operations</h1><p className="subtitle">A live view of registrations, capacity, resources, and operational alerts.</p></div><button className="secondary-button" onClick={loadDashboard}>Refresh</button></div>
    {error && <div className="error">{error}</div>}
    {stats && <section className="cards"><Card label="Registrations" value={stats.total_registrations} /><Card label="Revenue" value={`Rs. ${stats.total_revenue}`} /><Card label="Sessions" value={stats.total_sessions} /><Card label="Satisfaction" value={stats.satisfaction_avg ? `${stats.satisfaction_avg}/5` : "-"} /></section>}
    <section className="grid">
      <Panel title="Attendance Resource Forecast">{forecast ? <div className="metrics"><Metric label="Expected attendance" value={forecast.expected_attendance} /><Metric label="Seats" value={forecast.recommended_seats} /><Metric label="Meals" value={forecast.recommended_meals} /><Metric label="Badges" value={forecast.recommended_badges} /></div> : <Loading />}{forecast?.alert && <div className="warning">{forecast.alert}</div>}</Panel>
      <Panel title="Live Bottlenecks">{alerts.length ? alerts.map((alert, index) => <div className={`alert ${alert.severity}`} key={index}><b>{alert.severity.toUpperCase()}</b><span>{alert.message}</span></div>) : <div className="success">No active bottlenecks</div>}</Panel>
      <Panel title="Room Utilization">{rooms ? <><div className="mini-chart">{rooms.sessions.map((session) => <div className="chart-row" key={session.session_id}><span>{session.session_title}</span><div className="chart-track"><div className={`chart-fill ${session.status}`} style={{ width: `${Math.min(session.utilization_pct, 100)}%` }} /></div><strong>{session.utilization_pct}%</strong></div>)}</div><a className="text-button" href="#/rooms">Open room planner</a></> : <Loading />}</Panel>
      <Panel title="Prototype Coverage"><ul className="coverage"><li>Authentication and profiles</li><li>Conference and session management</li><li>Registration and payment tracking</li><li>Attendance and feedback</li><li>Sponsor and exhibitor management</li><li>Resource forecasting and bottlenecks</li></ul></Panel>
    </section>
  </>;
}

function App() {
  const [route, setRoute] = useState(() => window.location.hash.replace("#/", "") || "dashboard");
  const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState("");
  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash.replace("#/", "") || "dashboard");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  useEffect(() => {
    async function ensureDemoLogin() {
      if (localStorage.getItem("token")) {
        setReady(true);
        return;
      }
      try {
        const response = await fetch(`${API}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "organizer@demo.com", password: "demo123" }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Demo login failed");
        localStorage.setItem("token", data.access_token);
      } catch (caughtError) {
        setAuthError(caughtError.message);
      } finally {
        setReady(true);
      }
    }
    ensureDemoLogin();
  }, []);
  const page = { dashboard: <Dashboard />, conferences: <ConferencesPage />, sessions: <SessionsPage />, rooms: <RoomUtilizationPage />, announcements: <AnnouncementsPage /> }[route] || <Dashboard />;
  return <main className="app-shell"><header className="topbar"><a className="brand" href="#/dashboard">CMS <span>Organizer</span></a><nav>{Object.entries(routes).map(([key, label]) => <a className={route === key ? "active" : ""} href={`#/${key}`} key={key}>{label}</a>)}</nav></header><section className="workspace">{authError && <div className="error">{authError}</div>}{ready ? page : <Loading />}</section></main>;
}

function Card({ label, value }) { return <div className="card"><span>{label}</span><strong>{value}</strong></div>; }
function Metric({ label, value }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function Panel({ title, children }) { return <section className="panel"><h2>{title}</h2>{children}</section>; }
function Loading() { return <p className="muted">Loading...</p>; }

export default App;
