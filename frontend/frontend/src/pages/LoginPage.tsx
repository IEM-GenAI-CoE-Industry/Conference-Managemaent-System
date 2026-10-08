import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { roleHome, roleOptions, type AppRole } from "../access";

const demoAccounts: Record<AppRole, string> = {
  organizer: "organizer@demo.com",
  participant: "participant@demo.com",
  author: "author@demo.com",
  reviewer: "reviewer@demo.com",
  speaker: "speaker@demo.com",
};

export default function LoginPage() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<AppRole | "">("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedRole) {
      setError("Choose your account role to continue.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
        role: selectedRole,
      });
      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("role", res.data.role);
      localStorage.setItem("user_id", res.data.user_id);
      navigate(roleHome(res.data.role), { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.panel}>
        <div style={styles.heroPanel}>
          <span style={styles.kicker}>Conference Platform</span>
          <h1 style={styles.heroTitle}>Run your event with confidence.</h1>
          <p style={styles.heroText}>
            Track speakers, registrations, sessions, and attendee experiences from one sleek command center.
          </p>

          <div style={styles.metricsRow}>
            <div style={styles.metricBox}>
              <strong style={styles.metricValue}>2.4k</strong>
              <span style={styles.metricLabel}>Attendees</span>
            </div>
            <div style={styles.metricBox}>
              <strong style={styles.metricValue}>48</strong>
              <span style={styles.metricLabel}>Sessions</span>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.headerWrap}>
            <span style={styles.eyebrow}>Welcome back</span>
            <h2 style={styles.title}>Sign in</h2>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <form onSubmit={handleLogin}>
            <fieldset style={styles.roleFieldset}>
              <legend style={styles.label}>Sign in as</legend>
              <div role="radiogroup" aria-label="Account role" style={styles.roleGrid}>
                {roleOptions.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    role="radio"
                    aria-checked={selectedRole === role.value}
                    onClick={() => setSelectedRole(role.value)}
                    style={{ ...styles.roleButton, ...(selectedRole === role.value ? styles.selectedRoleButton : {}) }}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <div style={styles.demoAccounts}>
              <span style={styles.demoHint}>Demo login · password: demo123</span>
              <div style={styles.demoButtons}>
                {roleOptions.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    style={styles.demoButton}
                    onClick={() => {
                      setSelectedRole(role.value);
                      setEmail(demoAccounts[role.value]);
                      setPassword("demo123");
                      setError("");
                    }}
                  >
                    Use {role.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={styles.input}
                placeholder="you@example.com"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={styles.input}
                placeholder="••••••••"
              />
            </div>

            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <p style={styles.footerText}>
            Don’t have an account? <a href="/register" style={styles.link}>Create one</a>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "28px",
    background: "radial-gradient(circle at top left, rgba(96,165,250,0.24), transparent 30%), radial-gradient(circle at bottom right, rgba(168,85,247,0.18), transparent 25%), linear-gradient(135deg, #020817 0%, #0f172a 50%, #111827 100%)",
  },
  panel: {
    width: "100%",
    maxWidth: "1100px",
    display: "grid",
    gridTemplateColumns: "1.1fr 0.9fr",
    gap: 0,
    borderRadius: 28,
    overflow: "hidden",
    background: "rgba(15, 23, 42, 0.72)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    boxShadow: "0 25px 80px rgba(15, 23, 42, 0.6)",
    backdropFilter: "blur(14px)",
  },
  heroPanel: {
    background: "linear-gradient(135deg, rgba(59,130,246,0.25), rgba(168,85,247,0.18), rgba(15,23,42,0.24))",
    padding: "52px 42px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  kicker: {
    display: "inline-block",
    width: "fit-content",
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(96, 165, 250, 0.18)",
    border: "1px solid rgba(147, 197, 253, 0.3)",
    color: "#dbeafe",
    fontSize: 12,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    fontWeight: 700,
  },
  heroTitle: {
    margin: "18px 0 12px",
    fontSize: "clamp(2.1rem, 3vw, 3.4rem)",
    lineHeight: 1.05,
    color: "#f8fafc",
  },
  heroText: {
    margin: 0,
    maxWidth: 440,
    color: "#cbd5e1",
    fontSize: 17,
    lineHeight: 1.7,
  },
  metricsRow: {
    display: "flex",
    gap: 18,
    marginTop: 28,
  },
  metricBox: {
    flex: 1,
    borderRadius: 18,
    padding: "18px 20px",
    background: "rgba(15, 23, 42, 0.38)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
  },
  metricValue: {
    display: "block",
    color: "#f8fafc",
    fontSize: 28,
    fontWeight: 800,
  },
  metricLabel: {
    display: "block",
    marginTop: 6,
    color: "#cbd5e1",
    fontSize: 12,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  card: {
    background: "rgba(15, 23, 42, 0.8)",
    padding: "42px 34px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  headerWrap: {
    marginBottom: 18,
  },
  eyebrow: {
    color: "#93c5fd",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },
  title: {
    margin: "10px 0 0",
    fontSize: "2rem",
    color: "#f8fafc",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 18,
  },
  roleFieldset: {
    border: 0,
    padding: 0,
    margin: "0 0 20px",
  },
  roleGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 8,
    marginTop: 8,
  },
  demoAccounts: {
    marginBottom: 20,
    padding: 12,
    borderRadius: 12,
    background: "rgba(15, 23, 42, 0.5)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
  },
  demoHint: {
    display: "block",
    marginBottom: 8,
    color: "#cbd5e1",
    fontSize: 12,
  },
  demoButtons: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },
  demoButton: {
    padding: "6px 9px",
    border: "1px solid rgba(147, 197, 253, 0.35)",
    borderRadius: 8,
    background: "rgba(30, 64, 175, 0.18)",
    color: "#bfdbfe",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  roleButton: {
    minHeight: 42,
    padding: "9px 12px",
    border: "1px solid rgba(148, 163, 184, 0.28)",
    borderRadius: 8,
    background: "rgba(15, 23, 42, 0.55)",
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  selectedRoleButton: {
    border: "1px solid #38bdf8",
    background: "rgba(14, 116, 144, 0.36)",
    color: "#f0fdfa",
    boxShadow: "inset 0 0 0 1px rgba(56, 189, 248, 0.2)",
  },
  label: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: 600,
  },
  input: {
    width: "100%",
    padding: "13px 14px",
    border: "1px solid rgba(148, 163, 184, 0.24)",
    borderRadius: 12,
    background: "rgba(15, 23, 42, 0.72)",
    color: "#f8fafc",
    fontSize: 15,
    outline: "none",
    boxShadow: "inset 0 1px 2px rgba(15, 23, 42, 0.2)",
  },
  button: {
    width: "100%",
    marginTop: 10,
    padding: "14px 18px",
    border: "none",
    borderRadius: 12,
    background: "linear-gradient(135deg, #60a5fa 0%, #8b5cf6 100%)",
    color: "#ffffff",
    fontSize: 16,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 18px 36px rgba(96, 165, 250, 0.28)",
  },
  error: {
    background: "rgba(127, 29, 29, 0.2)",
    border: "1px solid rgba(248, 113, 113, 0.28)",
    color: "#fecaca",
    padding: "12px 14px",
    borderRadius: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  footerText: {
    marginTop: 18,
    textAlign: "center",
    color: "#cbd5e1",
    fontSize: 14,
  },
  link: {
    color: "#93c5fd",
    textDecoration: "none",
    fontWeight: 700,
  },
};
