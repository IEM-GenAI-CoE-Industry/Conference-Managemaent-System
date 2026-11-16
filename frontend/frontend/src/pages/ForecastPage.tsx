import { useEffect, useState } from "react";
import api from "../api";



interface ForecastData {
  registered_count: number;
  attendance_rate_percent: number;
  expected_attendance: number;
  recommended_seats: number;
  recommended_meals: number;
  recommended_badges: number;
  recommended_certificates: number;
  alert: string | null;
  conference_id?: number; conference_name?: string; attendance_rate_source?: string; buffer_percent?: number; assumptions?: string[];
}

interface StatCardProps {
  label: string;
  value: number | string;
  accent: string;
}

function StatCard({ label, value, accent }: StatCardProps) {
  return (
    <div style={{ ...styles.statCard, borderTop: `4px solid ${accent}` }}>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

export default function ForecastPage() {
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [conferenceId, setConferenceId] = useState(localStorage.getItem("selected_conference_id") || "");
  const [conferences, setConferences] = useState<Array<{id:number; name?:string; title?:string}>>([]);
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
      const id = conferenceId || localStorage.getItem("selected_conference_id") || "";
      if (!id) { setFetchError("Select a conference on the Conferences page first."); setForecast(null); return; }
      const res = await api.get(`/resources/forecast`, { params: { conference_id: Number(id) } });
      setForecast(res.data);
    } catch (err: any) {
      setFetchError(err?.response?.data?.detail ?? "Failed to load forecast.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get("/conferences/").then((res) => {
      const list = res.data ?? []; setConferences(list);
      const saved = localStorage.getItem("selected_conference_id");
      const id = list.some((c: any) => String(c.id) === saved) ? saved : (list[0] ? String(list[0].id) : "");
      setConferenceId(id); if (id) localStorage.setItem("selected_conference_id", id);
    }).catch(() => setFetchError("Unable to load conferences. Please refresh and try again."));
  }, []);
  useEffect(() => { if (conferenceId) fetchForecast(); }, [conferenceId]);

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
        `/resources/forecast/config?conference_id=${Number(conferenceId)}`,
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
        Attendance-based estimates for the selected conference.
      </p>
      <label htmlFor="forecast-conference">Conference</label>{" "}
      <select id="forecast-conference" value={conferenceId} onChange={(e) => { setConferenceId(e.target.value); localStorage.setItem("selected_conference_id", e.target.value); }}>
        <option value="">Select conference</option>{conferences.map((c) => <option key={c.id} value={c.id}>{c.name || c.title || `Conference #${c.id}`}</option>)}
      </select>

      {/* ── Alert Banner ── */}
      {forecast?.alert && (
        <div style={styles.alertBanner}>
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
              accent="#4f46e5"
            />
            <StatCard
              label="Attendance Rate"
              value={`${forecast.attendance_rate_percent}%`}
              accent="#7c3aed"
            />
            <StatCard
              label="Expected Attendance"
              value={forecast.expected_attendance}
              accent="#0d9488"
            />
          </div>

          <h2 style={styles.subheading}>Recommended Quantities</h2>
          <p style={styles.hint}>Includes a {forecast.buffer_percent ?? 7}% buffer on top of expected attendance.</p>
          <p style={styles.hint}>Estimate source: {forecast.attendance_rate_source === "recorded_attendance" ? "recorded attendance history" : forecast.attendance_rate_source === "organizer_override" ? "organizer-configured rate" : "default 84% assumption (no history available)"}.</p>
          {forecast.assumptions?.map((item) => <p key={item} style={styles.hint}>{item}</p>)}
          <div style={styles.statsGrid}>
            <StatCard
              label="Seats"
              value={forecast.recommended_seats}
              accent="#d97706"
            />
            <StatCard
              label="Meals"
              value={forecast.recommended_meals}
              accent="#dc2626"
            />
            <StatCard
              label="Badges"
              value={forecast.recommended_badges}
              accent="#2563eb"
            />
            <StatCard
              label="Certificates"
              value={forecast.recommended_certificates}
              accent="#059669"
            />
          </div>
        </>
      ) : null}

      {/* ── Override Config ── */}
      <section style={styles.card}>
        <h2 style={styles.subheading}>Override Attendance Rate</h2>
        <p style={styles.hint}>
          Set a custom attendance rate (%) for the selected conference. This setting is saved in the database.
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
            disabled={loading || !conferenceId}
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
  page: { padding: "2rem", maxWidth: 960, margin: "0 auto" },
  heading: { fontSize: "1.7rem", fontWeight: 700, marginBottom: "0.25rem", color: "#f8fafc" },
  subtitle: { color: "#cbd5e1", marginBottom: "1.25rem", fontSize: "0.95rem" },
  subheading: { fontSize: "1.05rem", fontWeight: 600, margin: "1.5rem 0 0.4rem", color: "#f1f5f9" },
  cardSubheading: { fontSize: "1.05rem", fontWeight: 600, margin: "1.5rem 0 0.4rem", color: "#1f2937" },
  hint: { color: "#a5b4cf", fontSize: "0.85rem", marginBottom: "0.75rem" },
  cardHint: { color: "#657080", fontSize: "0.85rem", marginBottom: "0.75rem" },
  alertBanner: { display: "flex", alignItems: "center", gap: "0.5rem", background: "#fff5f5", border: "1px solid #fc8181", borderRadius: 8, padding: "0.85rem 1.1rem", marginBottom: "1.25rem", color: "#c53030", fontSize: "0.95rem" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: "1rem", marginBottom: "0.5rem" },
  statCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "1.2rem 1rem", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", textAlign: "center" },
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
