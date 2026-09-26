import { useEffect, useState } from "react";
import api from "./api";

const CONFERENCE_ID = 1;

interface ForecastData {
  registered_count: number;
  attendance_rate_percent: number;
  expected_attendance: number;
  recommended_seats: number;
  recommended_meals: number;
  recommended_badges: number;
  recommended_certificates: number;
  alert: string | null;
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon: string;
  accent: string;
}

function StatCard({ label, value, icon, accent }: StatCardProps) {
  return (
    <div style={{ ...styles.statCard, borderTop: `4px solid ${accent}` }}>
      <div style={styles.statIcon}>{icon}</div>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

export default function ForecastPage() {
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [rateInput, setRateInput] = useState("");
  const [configuring, setConfiguring] = useState(false);
  const [configMsg, setConfigMsg] = useState("");
  const [configError, setConfigError] = useState("");

  const fetchForecast = async () => {
    setLoading(true);
    setFetchError("");
    try {
      const res = await api.get(`/resources/forecast?conference_id=${CONFERENCE_ID}`);
      setForecast(res.data);
    } catch (err: any) {
      setFetchError(err?.response?.data?.detail ?? "Failed to load forecast.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, []);

  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(rateInput);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      setConfigError("Enter a value between 0 and 100.");
      return;
    }
    setConfiguring(true);
    setConfigMsg("");
    setConfigError("");
    try {
      await api.post(
        `/resources/forecast/config?conference_id=${CONFERENCE_ID}`,
        { attendance_rate_percent: rate }
      );
      setConfigMsg(`Attendance rate set to ${rate}%. Refreshing forecast…`);
      setRateInput("");
      await fetchForecast();
      setConfigMsg(`Attendance rate updated to ${rate}%.`);
    } catch (err: any) {
      setConfigError(err?.response?.data?.detail ?? "Failed to update config.");
    } finally {
      setConfiguring(false);
    }
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Resource Forecast</h1>
      <p style={styles.subtitle}>
        Attendance-based estimates for Conference #{CONFERENCE_ID}
      </p>

      {/* ── Alert Banner ── */}
      {forecast?.alert && (
        <div style={styles.alertBanner}>
          <span style={styles.alertIcon}>⚠️</span>
          <strong>Capacity Warning: </strong>&nbsp;{forecast.alert}
        </div>
      )}

      {/* ── Stat Cards ── */}
      {loading ? (
        <p style={styles.muted}>Loading forecast…</p>
      ) : fetchError ? (
        <p style={styles.errorMsg}>{fetchError}</p>
      ) : forecast ? (
        <>
          <div style={styles.statsGrid}>
            <StatCard
              label="Registered Participants"
              value={forecast.registered_count}
              icon="📋"
              accent="#4f46e5"
            />
            <StatCard
              label="Attendance Rate"
              value={`${forecast.attendance_rate_percent}%`}
              icon="📊"
              accent="#7c3aed"
            />
            <StatCard
              label="Expected Attendance"
              value={forecast.expected_attendance}
              icon="👥"
              accent="#0d9488"
            />
          </div>

          <h2 style={styles.subheading}>Recommended Quantities</h2>
          <p style={styles.hint}>
            Includes a 7% buffer on top of expected attendance.
          </p>
          <div style={styles.statsGrid}>
            <StatCard
              label="Seats"
              value={forecast.recommended_seats}
              icon="🪑"
              accent="#d97706"
            />
            <StatCard
              label="Meals"
              value={forecast.recommended_meals}
              icon="🍽️"
              accent="#dc2626"
            />
            <StatCard
              label="Badges"
              value={forecast.recommended_badges}
              icon="🏷️"
              accent="#2563eb"
            />
            <StatCard
              label="Certificates"
              value={forecast.recommended_certificates}
              icon="📜"
              accent="#059669"
            />
          </div>
        </>
      ) : null}

      {/* ── Override Config ── */}
      <section style={styles.card}>
        <h2 style={styles.subheading}>Override Attendance Rate</h2>
        <p style={styles.hint}>
          Set a custom attendance rate (%) for this conference.
          Resets when the server restarts.
        </p>
        <form onSubmit={handleConfigSubmit} style={styles.configForm}>
          <input
            type="number"
            value={rateInput}
            onChange={(e) => {
              setRateInput(e.target.value);
              setConfigError("");
              setConfigMsg("");
            }}
            placeholder="e.g. 75"
            min={0}
            max={100}
            step={0.1}
            style={styles.configInput}
          />
          <button type="submit" disabled={configuring} style={styles.configBtn}>
            {configuring ? "Saving…" : "Apply"}
          </button>
          <button
            type="button"
            onClick={fetchForecast}
            style={styles.refreshBtn}
          >
            ↻ Refresh
          </button>
        </form>
        {configError && <p style={styles.errorMsg}>{configError}</p>}
        {configMsg && <p style={styles.successMsg}>{configMsg}</p>}
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "2rem", maxWidth: 960, margin: "0 auto", fontFamily: "sans-serif" },
  heading: { fontSize: "1.7rem", fontWeight: 700, marginBottom: "0.25rem", color: "#1a1a2e" },
  subtitle: { color: "#666", marginBottom: "1.25rem", fontSize: "0.95rem" },
  subheading: { fontSize: "1.05rem", fontWeight: 600, margin: "1.5rem 0 0.4rem", color: "#333" },
  hint: { color: "#888", fontSize: "0.85rem", marginBottom: "0.75rem" },
  alertBanner: { display: "flex", alignItems: "center", gap: "0.5rem", background: "#fff5f5", border: "1px solid #fc8181", borderRadius: 8, padding: "0.85rem 1.1rem", marginBottom: "1.25rem", color: "#c53030", fontSize: "0.95rem" },
  alertIcon: { fontSize: "1.2rem" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: "1rem", marginBottom: "0.5rem" },
  statCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "1.2rem 1rem", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", textAlign: "center" },
  statIcon: { fontSize: "1.6rem", marginBottom: "0.4rem" },
  statValue: { fontSize: "1.9rem", fontWeight: 700, color: "#1a1a2e", lineHeight: 1.2 },
  statLabel: { fontSize: "0.8rem", color: "#718096", marginTop: "0.3rem", fontWeight: 500 },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "1.5rem", marginTop: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  configForm: { display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" },
  configInput: { padding: "0.5rem 0.75rem", border: "1px solid #cbd5e0", borderRadius: 6, fontSize: "0.95rem", width: 130 },
  configBtn: { padding: "0.5rem 1.2rem", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 7, fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" },
  refreshBtn: { padding: "0.5rem 1rem", background: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e0", borderRadius: 7, fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" },
  muted: { color: "#888", fontStyle: "italic" },
  errorMsg: { color: "#c53030", fontSize: "0.875rem", marginTop: "0.5rem" },
  successMsg: { color: "#276749", fontSize: "0.875rem", marginTop: "0.5rem" },
};
