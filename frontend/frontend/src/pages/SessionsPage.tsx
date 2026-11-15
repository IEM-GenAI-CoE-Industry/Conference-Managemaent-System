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
  const [conferences, setConferences] = useState<ConferenceOption[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [form, setForm] = useState(initialForm);
  const [selectedConferenceId, setSelectedConferenceId] = useState("");
  const [sessionFilter, setSessionFilter] = useState("");
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [assignments, setAssignments] = useState<Record<number, string>>({});
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
      const response = await api.get(`/conferences/${conferenceId}/agenda`);
      setAgenda(response.data);
    } catch (caughtError: any) {
      setError(caughtError.response?.data?.detail || "Unable to load this agenda.");
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
    const speakerId = assignments[sessionId];
    if (!speakerId) { setError("Choose a speaker before assigning one."); return; }
    try {
      setError("");
      await api.post(`/sessions/${sessionId}/assign-speaker`, { speaker_id: Number(speakerId) });
      if (selectedConferenceId) await loadAgenda(selectedConferenceId);
    } catch (caughtError: any) { setError(caughtError.response?.data?.detail || "Unable to assign the speaker."); }
  }

  return <div className="module-page">
    <div className="page-heading"><div><p className="eyebrow">PROGRAMME BUILDER</p><h1>Sessions and schedule</h1><p className="subtitle">Build a conflict-aware programme with named conferences and speakers.</p></div></div>
    {error && <div className="error">{error}</div>}
    <section className="form-panel"><h2>Create session</h2><form className="field-grid" onSubmit={createSession}>
      <label>Conference<select value={form.conference_id} onChange={(event) => setForm({ ...form, conference_id: event.target.value })} required><option value="">Choose a conference</option>{conferences.map((conference) => <option key={conference.id} value={conference.id}>{conference.name}</option>)}</select></label>
      <label>Speaker<select value={form.speaker_id} onChange={(event) => setForm({ ...form, speaker_id: event.target.value })}><option value="">Assign later</option>{speakers.map((speaker) => <option key={speaker.id} value={speaker.id}>{speaker.name} ({speaker.email})</option>)}</select></label>
      <label className="span-two">Session title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label>
      <label>Start time<input type="datetime-local" value={form.start_time} onChange={(event) => setForm({ ...form, start_time: event.target.value })} required /></label>
      <label>End time<input type="datetime-local" min={form.start_time} value={form.end_time} onChange={(event) => setForm({ ...form, end_time: event.target.value })} required /></label>
      <label>Room<input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} required /></label>
      <label>Room capacity<input type="number" min="2" value={form.room_capacity} onChange={(event) => setForm({ ...form, room_capacity: event.target.value })} required /></label>
      <label>Expected attendees<input type="number" min="0" max={form.room_capacity || undefined} value={form.expected_attendees} onChange={(event) => setForm({ ...form, expected_attendees: event.target.value })} required /></label>
      <div className="span-two"><button disabled={loading}>{loading ? "Saving..." : "Create session"}</button></div>
      </form></section>
      <section className="agenda-panel"><div className="section-heading"><div><h2>Conference agenda</h2><span>Times are shown in your local timezone.</span></div><input
      type="search"
      placeholder="Filter by session title or room"
      value={sessionFilter}
      onChange={(event) => setSessionFilter(event.target.value)}/>
      <select value={selectedConferenceId} onChange={(event) => { setSelectedConferenceId(event.target.value); loadAgenda(event.target.value); }}><option value="">Choose a conference</option>{conferences.map((conference) => <option key={conference.id} value={conference.id}>{conference.name}</option>)}</select></div>{agenda ? <><h3>{agenda.conference.name}</h3>{filteredSessions.length ? <div className="session-list">{filteredSessions.map((session) => <article className="session-row" key={session.id}><div><span className="time-range">{formatTime(session.start_time)} - {formatTime(session.end_time)}</span><h3>{session.title}</h3><p>{session.location} | {session.expected_attendees}/{session.room_capacity} expected attendees</p></div><div className="speaker-control"><span>{session.speaker_id ? `Speaker #${session.speaker_id}${session.speaker_confirmed ? " confirmed" : " pending"}` : "No speaker assigned"}</span><select value={assignments[session.id] || ""} onChange={(event) => setAssignments({ ...assignments, [session.id]: event.target.value })}><option value="">Choose speaker</option>{speakers.map((speaker) => <option key={speaker.id} value={speaker.id}>{speaker.name}</option>)}</select><button type="button" className="secondary-button" onClick={() => assignSpeaker(session.id)}>Assign</button></div></article>)}</div> : <p className="empty-state">No sessions have been added to this conference yet.</p>}</> : <p className="empty-state">Choose a conference to view its agenda.</p>}</section>
      </div>;
    }
