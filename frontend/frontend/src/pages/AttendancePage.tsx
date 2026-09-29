import { useState } from "react";
import api from "../api";

type Attendance = { id: number; user_id: number; session_id: number; attended: boolean };
export default function AttendancePage() {
  const isOrganizer = localStorage.getItem("role") === "organizer";
  const [userId, setUserId] = useState(""); const [sessionId, setSessionId] = useState(""); const [records, setRecords] = useState<Attendance[]>([]); const [message, setMessage] = useState("");
  const load = async () => { try { setRecords((await api.get<Attendance[]>("/attendance/", { params: { session_id: Number(sessionId) } })).data); } catch (error: any) { setMessage(error.response?.data?.detail || "Unable to load attendance."); } };
  const mark = async (event: React.FormEvent) => { event.preventDefault(); try { await api.post("/attendance/mark", { user_id: Number(userId), session_id: Number(sessionId), attended: true }); setMessage("Attendance marked."); load(); } catch (error: any) { setMessage(error.response?.data?.detail || "Unable to mark attendance."); } };
  return (
    <main style={styles.page}>
      <header style={styles.header}><p style={styles.eyebrow}>Check-in</p><h1 style={styles.title}>Attendance</h1></header>
      {message && <p role="status" style={styles.message}>{message}</p>}
      <section style={styles.section}>
        <form onSubmit={mark} style={styles.form}>
          {isOrganizer && <label style={styles.label}>Participant user ID<input required type="number" min="1" placeholder="e.g. 5" value={userId} onChange={(e) => setUserId(e.target.value)} style={styles.input} /></label>}
          <label style={styles.label}>Session ID<input required type="number" min="1" placeholder="e.g. 2" value={sessionId} onChange={(e) => setSessionId(e.target.value)} style={styles.input} /></label>
          <div style={styles.actions}>{isOrganizer && <button style={styles.button}>Mark Attended</button>}<button type="button" onClick={load} disabled={!sessionId} style={styles.secondaryButton}>View Session Attendance</button></div>
        </form>
      </section>
      {records.length > 0 && <section style={styles.section}><h2 style={styles.sectionTitle}>Session Attendance</h2><ul style={styles.list}>{records.map((record) => <li key={record.id} style={styles.listItem}><strong>User #{record.user_id}</strong><span style={{ color: record.attended ? "#86efac" : "#fca5a5" }}>{record.attended ? "Attended" : "Not attended"}</span></li>)}</ul></section>}
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { width: "100%", maxWidth: 1000, margin: "0 auto", padding: "12px 0 40px" },
  header: { marginBottom: 24 },
  eyebrow: { margin: "0 0 6px", color: "#67e8f9", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em" },
  title: { margin: 0, color: "#f8fafc", fontSize: 34 },
  section: { marginTop: 18, padding: 24, border: "1px solid rgba(148,163,184,0.2)", borderRadius: 14, background: "linear-gradient(145deg, rgba(15,23,42,0.96), rgba(30,41,59,0.88))" },
  form: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: 18 },
  label: { display: "grid", gap: 8, color: "#dbeafe", fontWeight: 700, fontSize: 14 },
  input: { width: "100%", minHeight: 52, padding: "12px 14px", color: "#f8fafc", background: "#0b1220", border: "1px solid #475569", borderRadius: 8, fontSize: 16, boxSizing: "border-box" },
  actions: { gridColumn: "1 / -1", display: "flex", flexWrap: "wrap", gap: 12 },
  button: { minHeight: 50, padding: "12px 18px", border: 0, borderRadius: 8, background: "#0e7490", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer" },
  secondaryButton: { minHeight: 50, padding: "12px 18px", border: "1px solid #64748b", borderRadius: 8, background: "#1e293b", color: "#f8fafc", fontSize: 15, fontWeight: 700, cursor: "pointer" },
  message: { padding: "12px 16px", color: "#fef3c7", background: "rgba(146,64,14,0.24)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 8 },
  sectionTitle: { color: "#f8fafc", margin: "0 0 14px" },
  list: { display: "grid", gap: 8, listStyle: "none", margin: 0, padding: 0 },
  listItem: { display: "flex", justifyContent: "space-between", gap: 16, padding: 14, color: "#e2e8f0", background: "rgba(2,6,23,0.38)", borderRadius: 8 },
};
