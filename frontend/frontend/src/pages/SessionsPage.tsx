import { FormEvent, useEffect, useMemo, useState } from "react";
import api from "../api";

type ConferenceOption = { id: number; name: string; start_date?: string; end_date?: string; };
type Speaker = { id: number; name: string; email: string; };
type SessionItem = { id: number; conference_id: number; title: string; speaker_id?: number | null; speaker_confirmed?: boolean; start_time: string; end_time: string; location: string; room_capacity: number; expected_attendees: number; };
type Agenda = { conference: ConferenceOption; sessions: SessionItem[]; };

const initialForm = { conference_id: "", title: "", speaker_id: "", start_time: "", end_time: "", location: "", room_capacity: "", expected_attendees: "" };

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function SessionsPage() {
  const isOrganizer = localStorage.getItem("role") === "organizer";

  const [conferenceId, setConferenceId] = useState("");
  const [conferenceSearch, setConferenceSearch] = useState("");
  const [agenda, setAgenda] = useState<AgendaResponse | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [speakerSearch, setSpeakerSearch] = useState("");
  const [assignSpeakerIds, setAssignSpeakerIds] = useState<Record<number, string>>({});
  const [assignSpeakerSearch, setAssignSpeakerSearch] = useState<Record<number, string>>({});

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedConference = useMemo(() => conferences.find((conference) => String(conference.id) === form.conference_id), [conferences, form.conference_id]);
  const filteredSessions = useMemo(() => {
    if (!agenda) return [];

    const searchText = sessionFilter.trim().toLowerCase();

    if (!searchText) {
      return agenda.sessions;
    }

    return agenda.sessions.filter((session) =>
      session.title.toLowerCase().includes(searchText) ||
      session.location.toLowerCase().includes(searchText)
    );
  }, [agenda, sessionFilter]);

  async function loadChoices() {
    try {
      if (!isOrganizer) {
        const conferenceResponse = await api.get("/conferences/");
        setConferences(conferenceResponse.data);
        return;
      }

      const [conferenceResponse, speakerResponse] = await Promise.all([api.get("/conferences/"), api.get("/sessions/speakers")]);
      setConferences(conferenceResponse.data);
      setSpeakers(speakerResponse.data);
    } catch (caughtError: any) {
      setError(caughtError.response?.data?.detail || "Unable to load conference and speaker choices.");
    }
  }

  async function loadAgenda(conferenceId: string) {
    if (!conferenceId) return;
    try {
      setError("");
      const response = await api.get(`/conferences/${id}/agenda`);
      setAgenda(response.data);
      setSessions(response.data.sessions ?? []);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load conference agenda.");
      setAgenda(null);
    }
  }

  useEffect(() => { loadChoices(); }, []);

  async function createSession(event: FormEvent) {
    event.preventDefault();
    const capacity = Number(form.room_capacity);
    const attendees = Number(form.expected_attendees);
    const start = new Date(form.start_time);
    const end = new Date(form.end_time);
    if (end <= start) { setError("The end time must be after the start time."); return; }
    if (attendees > capacity) { setError("Expected attendees cannot be greater than room capacity."); return; }
    if (selectedConference?.start_date && selectedConference?.end_date) {
      const conferenceStart = new Date(`${selectedConference.start_date}T00:00:00`);
      const conferenceEnd = new Date(`${selectedConference.end_date}T23:59:59`);
      if (start < conferenceStart || end > conferenceEnd) { setError("Session times must be within the selected conference dates."); return; }
    }
    try {
      setLoading(true); setError("");
      await api.post("/sessions/", { conference_id: Number(form.conference_id), title: form.title, speaker_id: form.speaker_id ? Number(form.speaker_id) : null, start_time: start.toISOString(), end_time: end.toISOString(), location: form.location, room_capacity: capacity, expected_attendees: attendees });
      const conferenceId = form.conference_id;
      setForm(initialForm);
      setSelectedConferenceId(conferenceId);
      await loadAgenda(conferenceId);
    } catch (caughtError: any) {
      setError(caughtError.response?.data?.detail || "Unable to create the session.");
    } finally { setLoading(false); }
  }

  async function assignSpeaker(sessionId: number) {
    const speakerId = assignSpeakerIds[sessionId];

    if (!speakerId) {
      setError("Please select a speaker from the suggestions.");
      return;
    }

    if (!speakers.some((s) => String(s.id) === speakerId)) {
      setError("Please select a valid speaker from the suggestions.");
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
      setError(err.response?.data?.detail || "Failed to assign speaker.");
    }
  }

  function handleLoadAgenda(e: React.FormEvent) {
    e.preventDefault();

    if (!conferenceId) {
      setError("Please select a conference from the suggestions.");
      return;
    }

    loadAgenda(Number(conferenceId));
  }

  useEffect(() => {
    api.get("/conferences/")
      .then((res) => {
        const list: Conference[] = res.data ?? [];
        setConferences(list);

        const saved = localStorage.getItem("selected_conference_id");
        const selected = list.find((c) => String(c.id) === saved) || list[0];

        if (selected) {
          const id = String(selected.id);
          const name = selected.name || selected.title || `Conference ${id}`;

          setConferenceId(id);
          setConferenceSearch(name);
          setForm((prev) => ({
            ...prev,
            conference_id: prev.conference_id || id,
          }));
        }
      })
      .catch(() => setError("Unable to load conferences. Please refresh the page."));

    api.get("/users/speakers/")
      .then((res) => setSpeakers(res.data ?? []))
      .catch(() => setSpeakers([]));
  }, []);

  useEffect(() => {
    if (conferenceId) {
      const name = conferenceName(conferenceId);
      setConferenceSearch(name);
    }
  }, [conferenceId, conferences]);

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <p style={styles.eyebrow}>Program</p>
        <h1 style={styles.title}>Sessions &amp; Schedule</h1>
      </header>

      {error && <p role="alert" style={styles.error}>{error}</p>}

      {isOrganizer && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Create Session</h2>

          <form onSubmit={createSession} style={styles.form}>
            <label style={styles.label}>
              Conference
              <input
                style={styles.input}
                list="session-conferences"
                value={conferenceSearch}
                onChange={(e) => selectConference(e.target.value, "form")}
                placeholder="Search conference by name"
                required
              />
              <datalist id="session-conferences">
                {conferences.map((c) => (
                  <option
                    key={c.id}
                    value={c.name || c.title || `Conference ${c.id}`}
                  />
                ))}
              </datalist>
            </label>

            <label style={{ ...styles.label, gridColumn: "1 / -1" }}>
              Session Title
              <input
                style={styles.input}
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </label>

            <label style={styles.label}>
              Speaker (optional)
              <input
                style={styles.input}
                list="session-speakers"
                value={speakerSearch}
                onChange={(e) => selectSpeaker(e.target.value)}
                placeholder="Search speaker by name"
              />
              <datalist id="session-speakers">
                {speakers.map((sp) => (
                  <option
                    key={sp.id}
                    value={sp.name || sp.username || sp.email || `Speaker ${sp.id}`}
                  />
                ))}
              </datalist>
            </label>

            <label style={styles.label}>
              Start Time
              <input
                style={styles.input}
                type="datetime-local"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                required
              />
            </label>

            <label style={styles.label}>
              End Time
              <input
                style={styles.input}
                type="datetime-local"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                required
              />
            </label>

            <label style={styles.label}>
              Room Name
              <input
                style={styles.input}
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                required
              />
            </label>

            <label style={styles.label}>
              Room Capacity
              <input
                style={styles.input}
                type="number"
                min="1"
                value={form.room_capacity}
                onChange={(e) => setForm({ ...form, room_capacity: e.target.value })}
                required
              />
            </label>

            <label style={styles.label}>
              Expected Attendees
              <input
                style={styles.input}
                type="number"
                min="0"
                value={form.expected_attendees}
                onChange={(e) =>
                  setForm({ ...form, expected_attendees: e.target.value })
                }
              />
            </label>

            <button type="submit" disabled={loading} style={styles.button}>
              {loading ? "Creating..." : "Create Session"}
            </button>
          </form>
        </section>
      )}

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>View Conference Agenda</h2>

        <form onSubmit={handleLoadAgenda} style={styles.agendaForm}>
          <label style={styles.label}>
            Conference
            <input
              style={styles.input}
              list="agenda-conferences"
              value={conferenceSearch}
              onChange={(e) => selectConference(e.target.value, "agenda")}
              placeholder="Search conference by name"
              required
            />
            <datalist id="agenda-conferences">
              {conferences.map((c) => (
                <option
                  key={c.id}
                  value={c.name || c.title || `Conference ${c.id}`}
                />
              ))}
            </datalist>
          </label>

          <button type="submit" style={styles.secondaryButton}>
            Load Agenda
          </button>
        </form>

        {agenda && (
          <div style={styles.agenda}>
            <h3 style={styles.agendaTitle}>{agenda.conference.name}</h3>

            {sessions.length === 0 ? (
              <p style={styles.muted}>No sessions found.</p>
            ) : (
              <ol style={styles.sessionList}>
                {sessions.map((session) => (
                  <li key={session.id} style={styles.sessionItem}>
                    <strong style={styles.sessionTitle}>{session.title}</strong>

                    <p style={styles.sessionMeta}>
                      {session.start_time} - {session.end_time}
                    </p>

                    <p style={styles.sessionMeta}>
                      Room: {session.location} · Capacity: {session.room_capacity}
                      {" · "}Expected: {session.expected_attendees ?? "N/A"}
                    </p>

                    <p style={styles.sessionMeta}>
                      Speaker: {speakerName(session.speaker_id)}
                    </p>

                    {isOrganizer && (
                      <div style={styles.assignForm}>
                        <input
                          aria-label={`Search speaker for ${session.title}`}
                          style={styles.input}
                          list={`assign-speakers-${session.id}`}
                          placeholder="Search speaker by name"
                          value={assignSpeakerSearch[session.id] || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            const selected = speakers.find(
                              (sp) =>
                                (sp.name || sp.username || sp.email ||
                                  `Speaker ${sp.id}`) === value
                            );

                            setAssignSpeakerSearch((prev) => ({
                              ...prev,
                              [session.id]: value,
                            }));

                            setAssignSpeakerIds((prev) => ({
                              ...prev,
                              [session.id]: selected ? String(selected.id) : "",
                            }));
                          }}
                        />

                        <datalist id={`assign-speakers-${session.id}`}>
                          {speakers.map((sp) => (
                            <option
                              key={sp.id}
                              value={sp.name || sp.username || sp.email || `Speaker ${sp.id}`}
                            />
                          ))}
                        </datalist>

                        <button
                          type="button"
                          style={styles.secondaryButton}
                          onClick={() => assignSpeaker(session.id)}
                        >
                          Assign Speaker
                        </button>
                      </div>
                    )}
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
  page: {
    width: "100%",
    maxWidth: 1100,
    margin: "0 auto",
    padding: "12px 0 40px",
  },
  header: { marginBottom: 24 },
  eyebrow: {
    margin: "0 0 6px",
    color: "#67e8f9",
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
  },
  title: { margin: 0, color: "#f8fafc", fontSize: 34 },
  section: {
    marginTop: 18,
    padding: 26,
    border: "1px solid rgba(148,163,184,0.2)",
    borderRadius: 14,
    background: "linear-gradient(145deg, rgba(15,23,42,0.96), rgba(30,41,59,0.88))",
    boxShadow: "0 16px 32px rgba(2,6,23,0.22)",
  },
  sectionTitle: { margin: "0 0 22px", color: "#f8fafc", fontSize: 22 },
  form: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 270px), 1fr))",
    gap: 20,
  },
  label: {
    display: "grid",
    alignContent: "start",
    gap: 9,
    color: "#dbeafe",
    fontSize: 15,
    fontWeight: 700,
  },
  input: {
    width: "100%",
    minWidth: 0,
    minHeight: 54,
    padding: "13px 15px",
    color: "#f8fafc",
    background: "#0b1220",
    border: "1px solid #475569",
    borderRadius: 8,
    fontSize: 16,
    boxSizing: "border-box",
  },
  button: {
    gridColumn: "1 / -1",
    justifySelf: "start",
    minHeight: 52,
    padding: "13px 22px",
    border: 0,
    borderRadius: 8,
    background: "#0e7490",
    color: "#fff",
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
  },
  secondaryButton: {
    minHeight: 52,
    padding: "13px 20px",
    border: "1px solid #64748b",
    borderRadius: 8,
    background: "#1e293b",
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  },
  agendaForm: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "end",
    gap: 14,
  },
  agenda: { marginTop: 24 },
  agendaTitle: { color: "#f8fafc", fontSize: 20 },
  sessionList: { display: "grid", gap: 14, paddingLeft: 24 },
  sessionItem: {
    padding: 18,
    color: "#e2e8f0",
    background: "rgba(2,6,23,0.38)",
    border: "1px solid rgba(148,163,184,0.14)",
    borderRadius: 8,
  },
  sessionTitle: { color: "#f8fafc", fontSize: 18 },
  sessionMeta: {
    margin: "8px 0 0",
    color: "#cbd5e1",
    overflowWrap: "anywhere",
  },
  assignForm: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
  },
  muted: { color: "#cbd5e1" },
  error: {
    padding: "12px 16px",
    color: "#fecaca",
    background: "rgba(127,29,29,0.24)",
    border: "1px solid rgba(248,113,113,0.25)",
    borderRadius: 8,
  },
};

export default SessionsPage;