import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import "./App.css";

import LoginPage from "./LoginPage";
import SignupPage from "./SignupPage";
import RegistrationPage from "./RegistrationPage";

import { SubmissionsPage } from "./pages/SubmissionsPage";
import OrganizerSubmissionPage from "./pages/OrganizerSubmissionPage";
import { ReviewsPage } from "./pages/ReviewsPage";
import { SearchPage } from "./pages/SearchPage";

const API = "http://127.0.0.1:8000";

type Tab =
  | "dashboard"
  | "registration"
  | "submissions"
  | "organizer"
  | "reviews"
  | "search";

function Dashboard({
  token,
  stats,
  forecast,
  rooms,
  alerts,
  error,
  loadDashboard,
}: {
  token: string;
  stats: any;
  forecast: any;
  rooms: any;
  alerts: any[];
  error: string;
  loadDashboard: () => void;
}) {
  return (
    <main className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">CONFERENCE MANAGEMENT SYSTEM</p>

          <h1>Organizer Control Center</h1>

          <p className="subtitle">
            A working prototype for registration, scheduling, attendance and
            conference operations intelligence.
          </p>
        </div>

        <button onClick={loadDashboard} className="refresh">
          Refresh
        </button>
      </header>

      {error && <div className="error">{error}</div>}

      {stats && (
        <section className="cards">
          <Card
            label="Registrations"
            value={stats.total_registrations}
          />

          <Card
            label="Revenue"
            value={`₹${stats.total_revenue}`}
          />

          <Card
            label="Sessions"
            value={stats.total_sessions}
          />

          <Card
            label="Satisfaction"
            value={
              stats.satisfaction_avg
                ? `${stats.satisfaction_avg}/5`
                : "—"
            }
          />
        </section>
      )}

      <section className="grid">
        <Panel title="Attendance-Based Resource Forecasting">
          {forecast ? (
            <div className="metrics">
              <Metric
                label="Expected attendance"
                value={forecast.expected_attendance}
              />

              <Metric
                label="Seats"
                value={forecast.recommended_seats}
              />

              <Metric
                label="Meals"
                value={forecast.recommended_meals}
              />

              <Metric
                label="Badges"
                value={forecast.recommended_badges}
              />
            </div>
          ) : (
            <Loading />
          )}

          {forecast?.alert && (
            <div className="warning">
              ⚠ {forecast.alert}
            </div>
          )}
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
            <div className="success">
              ✓ No active bottlenecks
            </div>
          )}
        </Panel>

        <Panel title="Room Utilization Optimizer">
          {rooms ? (
            rooms.sessions.map((s: any) => (
              <div className="room" key={s.session_id}>
                <div>
                  <b>{s.session_title}</b>

                  <small>
                    {s.room} · capacity {s.room_capacity}
                  </small>
                </div>

                <span className={`pill ${s.status}`}>
                  {s.utilization_pct}% · {s.status}
                </span>
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
  const [loggedIn, setLoggedIn] = useState(
    Boolean(localStorage.getItem("token"))
  );

  const [token, setToken] = useState(
    localStorage.getItem("token") || ""
  );

  const [activeTab, setActiveTab] =
    useState<Tab>("dashboard");

  const [showLogin, setShowLogin] = useState(false);

  const [showSignup, setShowSignup] = useState(false);

  const [stats, setStats] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [rooms, setRooms] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [error, setError] = useState("");

  async function loadDashboard() {
    if (!token) {
      return;
    }

    try {
      setError("");

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const get = async (path: string) => {
        const response = await fetch(`${API}${path}`, {
          headers,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail || "Request failed"
          );
        }

        return data;
      };

      setStats(
        await get(
          "/dashboard/stats?conference_id=1"
        )
      );

      setForecast(
        await get(
          "/resources/forecast?conference_id=1"
        )
      );

      setRooms(
        await get(
          "/rooms/utilization?conference_id=1"
        )
      );

      setAlerts(
        await get(
          "/bottlenecks?conference_id=1"
        )
      );
    } catch (e: any) {
      setError(
        e.message ||
          "Failed to fetch dashboard data"
      );

      if (
        e.message
          ?.toLowerCase()
          .includes("token")
      ) {
        localStorage.removeItem("token");
        setToken("");
        setLoggedIn(false);
      }
    }
  }

  useEffect(() => {
    if (loggedIn && token) {
      loadDashboard();
    }
  }, [loggedIn, token]);

  const handleLogin = () => {
    const savedToken =
      localStorage.getItem("token");

    if (savedToken) {
      setToken(savedToken);
      setLoggedIn(true);
      setShowLogin(false);
      setShowSignup(false);
      setActiveTab("dashboard");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");

    setToken("");
    setLoggedIn(false);

    setShowLogin(false);
    setShowSignup(false);

    setActiveTab("dashboard");

    setStats(null);
    setForecast(null);
    setRooms(null);
    setAlerts([]);
    setError("");
  };

  const handleOpenLogin = () => {
    setShowSignup(false);
    setShowLogin(true);
  };

  const handleOpenSignup = () => {
    setShowLogin(false);
    setShowSignup(true);
  };

  const navItemStyle = (
    tab: Tab
  ): CSSProperties => ({
    padding: "8px 16px",
    borderRadius: "6px",
    border: "none",

    backgroundColor:
      activeTab === tab
        ? "#4F46E5"
        : "transparent",

    color:
      activeTab === tab
        ? "#FFFFFF"
        : "#64748B",

    fontWeight: 600,
    fontSize: "0.875rem",
    cursor: "pointer",
  });

  return (
    <div
      style={{
        backgroundColor: "#F8FAFC",
        minHeight: "100vh",
        fontFamily:
          "Inter, system-ui, sans-serif",
      }}
    >
      {/* NAVBAR */}

      <nav
        style={{
          backgroundColor: "#FFFFFF",
          borderBottom:
            "1px solid #E2E8F0",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: "1200px",
          margin: "0 auto",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        {/* LOGO */}

        <div
          style={{
            fontWeight: 700,
            fontSize: "1.125rem",
            color: "#0F172A",
          }}
        >
          CMS Portal
        </div>

        {/* NAVIGATION */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <button
            style={navItemStyle("dashboard")}
            onClick={() => {
              setShowLogin(false);
              setShowSignup(false);
              setActiveTab("dashboard");
            }}
          >
            Dashboard
          </button>

          <button
            style={navItemStyle("registration")}
            onClick={() => {
              setShowLogin(false);
              setShowSignup(false);
              setActiveTab("registration");
            }}
          >
            Registration
          </button>

          <button
            style={navItemStyle("submissions")}
            onClick={() => {
              setShowLogin(false);
              setShowSignup(false);
              setActiveTab("submissions");
            }}
          >
            Author Submissions
          </button>

          <button
            style={navItemStyle("organizer")}
            onClick={() => {
              setShowLogin(false);
              setShowSignup(false);
              setActiveTab("organizer");
            }}
          >
            Organizer Submissions
          </button>

          <button
            style={navItemStyle("reviews")}
            onClick={() => {
              setShowLogin(false);
              setShowSignup(false);
              setActiveTab("reviews");
            }}
          >
            Peer Reviews
          </button>

          <button
            style={navItemStyle("search")}
            onClick={() => {
              setShowLogin(false);
              setShowSignup(false);
              setActiveTab("search");
            }}
          >
            Directory Search
          </button>

          {/* CREATE ACCOUNT */}

          {!loggedIn && (
            <button
              onClick={handleOpenSignup}
              style={{
                padding: "8px 18px",
                borderRadius: "6px",
                border:
                  "1px solid #4F46E5",
                backgroundColor: "#FFFFFF",
                color: "#4F46E5",
                fontWeight: 600,
                fontSize: "0.875rem",
                cursor: "pointer",
                marginLeft: "4px",
              }}
            >
              Create Account
            </button>
          )}

          {/* LOGIN / LOGOUT */}

          <button
            onClick={() => {
              if (loggedIn) {
                handleLogout();
              } else {
                handleOpenLogin();
              }
            }}
            style={{
              padding: "8px 18px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "#4F46E5",
              color: "#FFFFFF",
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: "pointer",
              marginLeft: "4px",
            }}
          >
            {loggedIn ? "Logout" : "Login"}
          </button>
        </div>
      </nav>

      {/* PAGE CONTENT */}

      <div>
        {/* SIGNUP PAGE */}

        {showSignup ? (
          <div
            style={{
              padding: "40px 20px",
            }}
          >
            <button
              onClick={() => {
                setShowSignup(false);
                setShowLogin(true);
              }}
              style={{
                marginBottom: "20px",
                padding: "8px 14px",
                border:
                  "1px solid #CBD5E1",
                borderRadius: "6px",
                background: "#FFFFFF",
                cursor: "pointer",
                color: "#334155",
                fontWeight: 500,
              }}
            >
              ← Back to Login
            </button>

            <SignupPage
              onRegistered={() => {
                setShowSignup(false);
                setShowLogin(true);
              }}
              onBackToLogin={() => {
                setShowSignup(false);
                setShowLogin(true);
              }}
            />
          </div>
        ) : showLogin ? (
          /* LOGIN PAGE */

          <div
            style={{
              padding: "40px 20px",
            }}
          >
            <button
              onClick={() => {
                setShowLogin(false);
              }}
              style={{
                marginBottom: "20px",
                padding: "8px 14px",
                border:
                  "1px solid #CBD5E1",
                borderRadius: "6px",
                background: "#FFFFFF",
                cursor: "pointer",
                color: "#334155",
                fontWeight: 500,
              }}
            >
              ← Back to Dashboard
            </button>

            <LoginPage
              onLogin={handleLogin}
              onSignup={handleOpenSignup}
            />
          </div>
        ) : (
          <>
            {/* DASHBOARD */}

            {activeTab === "dashboard" && (
              <Dashboard
                token={token}
                stats={stats}
                forecast={forecast}
                rooms={rooms}
                alerts={alerts}
                error={error}
                loadDashboard={
                  loadDashboard
                }
              />
            )}

            {/* REGISTRATION */}

            {activeTab === "registration" && (
              <RegistrationPage />
            )}

            {/* AUTHOR SUBMISSIONS */}

            {activeTab === "submissions" && (
              <SubmissionsPage />
            )}

            {/* ORGANIZER SUBMISSIONS */}

            {activeTab === "organizer" && (
              <OrganizerSubmissionPage />
            )}

            {/* PEER REVIEWS */}

            {activeTab === "reviews" && (
              <ReviewsPage />
            )}

            {/* DIRECTORY SEARCH */}

            {activeTab === "search" && (
              <SearchPage />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Card({
  label,
  value,
}: {
  label: string;
  value: any;
}) {
  return (
    <div className="card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: any;
}) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Loading() {
  return (
    <p className="muted">
      Loading…
    </p>
  );
}

export default App;