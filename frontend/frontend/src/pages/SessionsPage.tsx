import { useEffect, useState } from "react";
import api from "../api";

type Session = {
  id: number;
  conference_id: number;
  title: string;
  speaker_id?: number | null;
  speaker_confirmed?: boolean;
  start_time: string;
  end_time: string;
  location: string;
  room_capacity: number;
  expected_attendees?: number | null;
};

type AgendaResponse = {
  conference: {
    id: number;
    name: string;
  };
  sessions: Session[];
};

function SessionsPage() {
  const isOrganizer = localStorage.getItem("role") === "organizer";
  const [conferenceId, setConferenceId] = useState("");
  const [agenda, setAgenda] = useState<AgendaResponse | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);

  const [form, setForm] = useState({
    conference_id: "",
    title: "",
    speaker_id: "",
    start_time: "",
    end_time: "",
    location: "",
    room_capacity: "",
    expected_attendees: "",
  });

  const [assignSpeakerIds, setAssignSpeakerIds] = useState<{
    [key: number]: string;
  }>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load agenda for a conference
  async function loadAgenda(id: number) {
    try {
      setError("");

      const response = await api.get(`/conferences/${id}/agenda`);

      setAgenda(response.data);
      setSessions(response.data.sessions);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Failed to load conference agenda."
      );
      setAgenda(null);
      setSessions([]);
    }
  }

  // Create a session
  async function createSession(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      const payload = {
        conference_id: Number(form.conference_id),
        title: form.title,
        speaker_id: form.speaker_id
          ? Number(form.speaker_id)
          : null,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        location: form.location,
        room_capacity: Number(form.room_capacity),
        expected_attendees: form.expected_attendees
          ? Number(form.expected_attendees)
          : null,
      };

      await api.post("/sessions/", payload);

      const createdConferenceId = Number(form.conference_id);

      setForm({
        conference_id: "",
        title: "",
        speaker_id: "",
        start_time: "",
        end_time: "",
        location: "",
        room_capacity: "",
        expected_attendees: "",
      });

      setConferenceId(String(createdConferenceId));
      await loadAgenda(createdConferenceId);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Failed to create session."
      );
    } finally {
      setLoading(false);
    }
  }

  // Assign speaker to an existing session
  async function assignSpeaker(sessionId: number) {
    const speakerId = assignSpeakerIds[sessionId];

    if (!speakerId) {
      setError("Please enter a speaker ID.");
      return;
    }

    try {
      setError("");

      await api.post(`/sessions/${sessionId}/assign-speaker`, {
        speaker_id: Number(speakerId),
      });

      if (conferenceId) {
        await loadAgenda(Number(conferenceId));
      }
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Failed to assign speaker."
      );
    }
  }

  // Load agenda when conference ID is submitted
  function handleLoadAgenda(e: React.FormEvent) {
    e.preventDefault();

    if (!conferenceId) {
      setError("Please enter a conference ID.");
      return;
    }

    loadAgenda(Number(conferenceId));
  }

  useEffect(() => {
    if (form.conference_id) {
      setConferenceId(form.conference_id);
    }
  }, [form.conference_id]);

  return (
    <main style={styles.page}>
      <header style={styles.header}><p style={styles.eyebrow}>Program</p><h1 style={styles.title}>Sessions &amp; Schedule</h1></header>
      {error && <p role="alert" style={styles.error}>{error}</p>}

      {isOrganizer && <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Create Session</h2>
        <form onSubmit={createSession} style={styles.form}>
          <label style={styles.label}>Conference ID<input style={styles.input} type="number" min="1" value={form.conference_id} onChange={(e) => setForm({ ...form, conference_id: e.target.value })} required /></label>
          <label style={{ ...styles.label, gridColumn: "1 / -1" }}>Session Title<input style={styles.input} type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
          <label style={styles.label}>Speaker ID (optional)<input style={styles.input} type="number" min="1" value={form.speaker_id} onChange={(e) => setForm({ ...form, speaker_id: e.target.value })} /></label>
          <label style={styles.label}>Start Time<input style={styles.input} type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required /></label>
          <label style={styles.label}>End Time<input style={styles.input} type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} required /></label>
          <label style={styles.label}>Room Name<input style={styles.input} type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required /></label>
          <label style={styles.label}>Room Capacity<input style={styles.input} type="number" min="1" value={form.room_capacity} onChange={(e) => setForm({ ...form, room_capacity: e.target.value })} required /></label>
          <label style={styles.label}>Expected Attendees<input style={styles.input} type="number" min="0" value={form.expected_attendees} onChange={(e) => setForm({ ...form, expected_attendees: e.target.value })} /></label>
          <button type="submit" disabled={loading} style={styles.button}>{loading ? "Creating..." : "Create Session"}</button>
        </form>
      </section>}

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>View Conference Agenda</h2>
        <form onSubmit={handleLoadAgenda} style={styles.agendaForm}>
          <label style={styles.label}>Conference ID<input style={styles.input} type="number" min="1" placeholder="Enter conference ID" value={conferenceId} onChange={(e) => setConferenceId(e.target.value)} required /></label>
          <button type="submit" style={styles.secondaryButton}>Load Agenda</button>
        </form>
        {agenda && (
          <div style={styles.agenda}>
            <h3 style={styles.agendaTitle}>{agenda.conference.name}</h3>
            {sessions.length === 0 ? <p style={styles.muted}>No sessions found.</p> : (
              <ol style={styles.sessionList}>
                {sessions.map((session) => (
                  <li key={session.id} style={styles.sessionItem}>
                    <strong style={styles.sessionTitle}>{session.title}</strong>
                    <p style={styles.sessionMeta}>{session.start_time} - {session.end_time}</p>
                    <p style={styles.sessionMeta}>Room: {session.location} · Capacity: {session.room_capacity} · Expected: {session.expected_attendees ?? "N/A"}</p>
                    <p style={styles.sessionMeta}>Speaker: {session.speaker_id ?? "Not assigned"}</p>
                    {isOrganizer && <div style={styles.assignForm}>
                      <input style={styles.input} type="number" min="1" placeholder="Speaker ID" value={assignSpeakerIds[session.id] || ""} onChange={(e) => setAssignSpeakerIds({ ...assignSpeakerIds, [session.id]: e.target.value })} />
                      <button type="button" style={styles.secondaryButton} onClick={() => assignSpeaker(session.id)}>Assign Speaker</button>
                    </div>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { width: "100%", maxWidth: 1100, margin: "0 auto", padding: "12px 0 40px" },
  header: { marginBottom: 24 },
  eyebrow: { margin: "0 0 6px", color: "#67e8f9", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em" },
  title: { margin: 0, color: "#f8fafc", fontSize: 34 },
  section: { marginTop: 18, padding: 26, border: "1px solid rgba(148,163,184,0.2)", borderRadius: 14, background: "linear-gradient(145deg, rgba(15,23,42,0.96), rgba(30,41,59,0.88))", boxShadow: "0 16px 32px rgba(2,6,23,0.22)" },
  sectionTitle: { margin: "0 0 22px", color: "#f8fafc", fontSize: 22 },
  form: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 270px), 1fr))", gap: 20 },
  label: { display: "grid", alignContent: "start", gap: 9, color: "#dbeafe", fontSize: 15, fontWeight: 700 },
  input: { width: "100%", minWidth: 0, minHeight: 54, padding: "13px 15px", color: "#f8fafc", background: "#0b1220", border: "1px solid #475569", borderRadius: 8, fontSize: 16, boxSizing: "border-box" },
  button: { gridColumn: "1 / -1", justifySelf: "start", minHeight: 52, padding: "13px 22px", border: 0, borderRadius: 8, background: "#0e7490", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer" },
  secondaryButton: { minHeight: 52, padding: "13px 20px", border: "1px solid #64748b", borderRadius: 8, background: "#1e293b", color: "#f8fafc", fontSize: 15, fontWeight: 700, cursor: "pointer" },
  agendaForm: { display: "flex", flexWrap: "wrap", alignItems: "end", gap: 14 },
  agenda: { marginTop: 24 },
  agendaTitle: { color: "#f8fafc", fontSize: 20 },
  sessionList: { display: "grid", gap: 14, paddingLeft: 24 },
  sessionItem: { padding: 18, color: "#e2e8f0", background: "rgba(2,6,23,0.38)", border: "1px solid rgba(148,163,184,0.14)", borderRadius: 8 },
  sessionTitle: { color: "#f8fafc", fontSize: 18 },
  sessionMeta: { margin: "8px 0 0", color: "#cbd5e1", overflowWrap: "anywhere" },
  assignForm: { display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 },
  muted: { color: "#cbd5e1" },
  error: { padding: "12px 16px", color: "#fecaca", background: "rgba(127,29,29,0.24)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 8 },
};

export default SessionsPage;