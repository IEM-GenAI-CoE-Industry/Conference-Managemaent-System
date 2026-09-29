import { useEffect, useState } from "react";
import api from "../api";

type Severity = "critical" | "warning" | "info";

type BottleneckAlert = {
  severity: Severity;
  category: string;
  message: string;
  count: number;
};

type Conference = {
  id: number;
  name: string;
};

const severityOrder: Severity[] = ["critical", "warning", "info"];

const severityStyles: Record<Severity, { color: string; background: string; label: string }> = {
  critical: { color: "#fecaca", background: "rgba(185,28,28,0.18)", label: "Critical" },
  warning: { color: "#fde68a", background: "rgba(180,83,9,0.2)", label: "Warning" },
  info: { color: "#bae6fd", background: "rgba(3,105,161,0.2)", label: "Information" },
};

function recommendedAction(category: string): string {
  switch (category) {
    case "capacity":
      return "Review the room assignment or reduce expected attendance before the session begins.";
    case "payments":
      return "Follow up with the registrant and verify whether the payment needs manual reconciliation.";
    case "speakers":
      return "Contact the assigned speaker and record their confirmation, or assign a replacement.";
    case "reviews":
      return "Assign available reviewers so these submissions can enter the review queue.";
    case "attendance":
      return "Check registration levels and prepare the check-in team for this upcoming session.";
    default:
      return "Review this item with the conference operations team and record the resolution.";
  }
}

function affectedLabel(category: string, count: number): string {
  const unit = category === "capacity" || category === "attendance"
    ? "session"
    : category === "reviews"
      ? "paper"
      : category === "speakers"
        ? "speaker confirmation"
        : category === "payments"
          ? "payment"
          : "item";
  return `${count} ${unit}${count === 1 ? "" : "s"} affected`;
}

export default function BottleneckPage() {
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [conferenceId, setConferenceId] = useState("");
  const [alerts, setAlerts] = useState<BottleneckAlert[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function loadAlerts(id: number) {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<BottleneckAlert[]>("/bottlenecks", {
        params: { conference_id: id },
      });
      setAlerts(response.data);
      setLastUpdated(new Date());
    } catch (exception: any) {
      setError(exception.response?.data?.detail || "Unable to load bottlenecks.");
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function loadConferences() {
      try {
        const response = await api.get<Conference[]>("/conferences/");
        setConferences(response.data);
        const firstConference = response.data[0];
        if (firstConference) {
          setConferenceId(String(firstConference.id));
          await loadAlerts(firstConference.id);
        }
      } catch (exception: any) {
        setError(exception.response?.data?.detail || "Unable to load conferences.");
      }
    }

    loadConferences();
  }, []);

  const severityCounts = severityOrder.map((severity) => ({
    severity,
    count: alerts.filter((alert) => alert.severity === severity).length,
  }));

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Operations monitoring</p>
          <h1 style={styles.title}>Bottleneck Detector</h1>
          <p style={styles.subtitle}>Issues that may delay or disrupt conference operations.</p>
        </div>
        <div style={styles.controls}>
          <label style={styles.selectLabel}>
            Conference
            <select
              value={conferenceId}
              onChange={(event) => {
                const id = event.target.value;
                setConferenceId(id);
                if (id) loadAlerts(Number(id));
              }}
              disabled={conferences.length === 0 || loading}
              style={styles.select}
            >
              {conferences.length === 0 && <option value="">No conferences</option>}
              {conferences.map((conference) => (
                <option key={conference.id} value={conference.id}>{conference.name}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => conferenceId && loadAlerts(Number(conferenceId))}
            disabled={!conferenceId || loading}
            style={styles.refreshButton}
          >
            {loading ? "Checking..." : "Refresh"}
          </button>
        </div>
      </header>

      {error && <p role="alert" style={styles.error}>{error}</p>}

      <section aria-label="Alert totals" style={styles.summaryGrid}>
        {severityCounts.map(({ severity, count }) => (
          <div key={severity} style={{ ...styles.summaryCard, borderTop: `3px solid ${severityStyles[severity].color}` }}>
            <span style={styles.summaryLabel}>{severityStyles[severity].label}</span>
            <strong style={{ ...styles.summaryValue, color: severityStyles[severity].color }}>{count}</strong>
            <span style={styles.summaryCaption}>{count === 1 ? "open alert" : "open alerts"}</span>
          </div>
        ))}
        <div style={{ ...styles.summaryCard, borderTop: "3px solid #94a3b8" }}>
          <span style={styles.summaryLabel}>Total</span>
          <strong style={styles.totalValue}>{alerts.length}</strong>
          <span style={styles.summaryCaption}>open alerts</span>
        </div>
      </section>

      <section style={styles.alertSection}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Open issues</h2>
          {lastUpdated && <span style={styles.updated}>Updated {lastUpdated.toLocaleTimeString()}</span>}
        </div>

        {loading && alerts.length === 0 ? (
          <p style={styles.emptyState}>Checking conference operations...</p>
        ) : alerts.length > 0 ? (
          <div style={styles.alertList}>
            {alerts.map((alert, index) => {
              const severity = severityStyles[alert.severity] ?? severityStyles.info;
              return (
                <article key={`${alert.category}-${index}`} style={{ ...styles.alertCard, borderLeft: `4px solid ${severity.color}` }}>
                  <div style={styles.alertHeading}>
                    <span style={{ ...styles.badge, color: severity.color, background: severity.background }}>{severity.label}</span>
                    <span style={styles.category}>{alert.category}</span>
                    <span style={styles.affected}>{affectedLabel(alert.category, alert.count)}</span>
                  </div>
                  <p style={styles.alertMessage}>{alert.message}</p>
                  <div style={styles.actionBox}>
                    <strong style={styles.actionLabel}>Recommended next step</strong>
                    <p style={styles.actionText}>{recommendedAction(alert.category)}</p>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div style={styles.clearState}>
            <strong>No active bottlenecks</strong>
            <p>There are no flagged operational issues for this conference right now.</p>
          </div>
        )}
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { width: "100%", maxWidth: 1100, margin: "0 auto", padding: "12px 0 40px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "end", flexWrap: "wrap", gap: 22, marginBottom: 28 },
  eyebrow: { margin: "0 0 6px", color: "#67e8f9", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em" },
  title: { margin: 0, color: "#f8fafc", fontSize: 34 },
  subtitle: { margin: "8px 0 0", color: "#cbd5e1" },
  controls: { display: "flex", alignItems: "end", flexWrap: "wrap", gap: 12 },
  selectLabel: { display: "grid", gap: 7, color: "#cbd5e1", fontSize: 13, fontWeight: 700 },
  select: { minWidth: 240, maxWidth: "min(380px, 70vw)", minHeight: 44, padding: "9px 12px", border: "1px solid #475569", borderRadius: 8, background: "#0b1220", color: "#f8fafc", fontSize: 14 },
  refreshButton: { minHeight: 44, padding: "10px 18px", border: "1px solid rgba(103,232,249,0.35)", borderRadius: 8, background: "#0e7490", color: "#fff", fontWeight: 800, cursor: "pointer" },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14 },
  summaryCard: { display: "grid", gap: 4, padding: "16px 18px", border: "1px solid rgba(148,163,184,0.18)", borderRadius: 10, background: "rgba(15,23,42,0.76)" },
  summaryLabel: { color: "#cbd5e1", fontSize: 13, fontWeight: 700 },
  summaryValue: { fontSize: 30, lineHeight: 1.15 },
  totalValue: { color: "#f8fafc", fontSize: 30, lineHeight: 1.15 },
  summaryCaption: { color: "#94a3b8", fontSize: 12 },
  alertSection: { marginTop: 28 },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12, marginBottom: 14 },
  sectionTitle: { margin: 0, color: "#f8fafc", fontSize: 21 },
  updated: { color: "#94a3b8", fontSize: 12 },
  alertList: { display: "grid", gap: 14 },
  alertCard: { padding: "18px 20px", border: "1px solid rgba(148,163,184,0.18)", borderRadius: 10, background: "linear-gradient(145deg, rgba(15,23,42,0.94), rgba(30,41,59,0.8))" },
  alertHeading: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 },
  badge: { padding: "5px 9px", borderRadius: 6, fontSize: 12, fontWeight: 800 },
  category: { color: "#cbd5e1", fontSize: 13, textTransform: "capitalize" },
  affected: { marginLeft: "auto", color: "#94a3b8", fontSize: 13 },
  alertMessage: { margin: "14px 0", color: "#f8fafc", fontSize: 17, fontWeight: 700 },
  actionBox: { padding: "12px 14px", borderRadius: 8, background: "rgba(2,6,23,0.36)" },
  actionLabel: { color: "#a5f3fc", fontSize: 12, textTransform: "uppercase" },
  actionText: { margin: "5px 0 0", color: "#cbd5e1", lineHeight: 1.5 },
  error: { padding: "12px 16px", color: "#fecaca", background: "rgba(127,29,29,0.24)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 8 },
  emptyState: { padding: "20px 0", color: "#cbd5e1" },
  clearState: { padding: "24px", border: "1px solid rgba(45,212,191,0.25)", borderRadius: 10, background: "rgba(13,148,136,0.1)", color: "#ccfbf1" },
};