import { useState } from "react";
import api from "../api";

const ROLES = ["participant", "author", "reviewer", "speaker"];

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "participant" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/auth/register", form);
      setSuccess("Registered successfully! Redirecting to login...");
      setTimeout(() => (window.location.href = "/login"), 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.panel}>
        <div style={styles.heroPanel}>
          <span style={styles.kicker}>Join us</span>
          <h1 style={styles.heroTitle}>Build your conference story.</h1>
          <p style={styles.heroText}>
            Create your account and unlock access to sessions, registration tools, speaker dashboards, and event operations.
          </p>

          <div style={styles.benefitsList}>
            <div style={styles.benefitItem}>✓ Personalized attendee access</div>
            <div style={styles.benefitItem}>✓ Event updates and communication</div>
            <div style={styles.benefitItem}>✓ Seamless conference workflow</div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.headerWrap}>
            <span style={styles.eyebrow}>Create account</span>
            <h2 style={styles.title}>Register</h2>
          </div>

          {error && <div style={styles.error}>{error}</div>}
          {success && <div style={styles.success}>{success}</div>}

          <form onSubmit={handleRegister}>
            {[
              { key: "name", label: "Name", type: "text" },
              { key: "email", label: "Email", type: "email" },
              { key: "password", label: "Password", type: "password" },
            ].map((field) => (
              <div key={field.key} style={styles.field}>
                <label style={styles.label}>{field.label}</label>
                <input
                  name={field.key}
                  type={field.type}
                  value={form[field.key as keyof typeof form]}
                  onChange={handleChange}
                  required
                  style={styles.input}
                  placeholder={field.key === "password" ? "Minimum 6 characters" : field.key === "email" ? "you@example.com" : "Your name"}
                />
              </div>
            ))}

            <div style={styles.field}>
              <label style={styles.label}>Role</label>
              <select name="role" value={form.role} onChange={handleChange} style={styles.input}>
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? "Registering..." : "Create account"}
            </button>
          </form>

          <p style={styles.footerText}>
            Already have an account? <a href="/login" style={styles.link}>Login</a>
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
    background: "radial-gradient(circle at top left, rgba(96,165,250,0.18), transparent 30%), radial-gradient(circle at bottom right, rgba(45,212,191,0.14), transparent 35%), linear-gradient(135deg, #020817 0%, #111827 45%, #0f172a 100%)",
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
    background: "linear-gradient(135deg, rgba(14,116,144,0.22), rgba(59,130,246,0.16), rgba(168,85,247,0.2), rgba(15,23,42,0.18))",
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
    background: "rgba(45, 212, 191, 0.12)",
    border: "1px solid rgba(45, 212, 191, 0.22)",
    color: "#cffafe",
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
    maxWidth: 430,
    color: "#cbd5e1",
    fontSize: 17,
    lineHeight: 1.7,
  },
  benefitsList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginTop: 26,
  },
  benefitItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 16px",
    borderRadius: 12,
    background: "rgba(15, 23, 42, 0.34)",
    border: "1px solid rgba(148, 163, 184, 0.12)",
    color: "#e2e8f0",
    width: "fit-content",
    minWidth: 220,
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
    background: "linear-gradient(135deg, #38bdf8 0%, #8b5cf6 100%)",
    color: "#ffffff",
    fontSize: 16,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 18px 36px rgba(59, 130, 246, 0.28)",
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
  success: {
    background: "rgba(6, 95, 70, 0.2)",
    border: "1px solid rgba(52, 211, 153, 0.28)",
    color: "#bbf7d0",
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
