import { FormEvent, useEffect, useState } from "react";
import api from "../api";

type Conference = { id: number; name: string };
type Announcement = { id: number; title: string; message: string; conference_id: number; audience: string; scheduled_for?: string | null; delivery_channel: string; };

const initialForm = { conference_id: "", title: "", message: "", audience: "all attendees", scheduled_for: "", delivery_channel: "in-app" };

export default function AnnouncementsPage() {
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [conferenceId, setConferenceId] = useState("");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get("/conferences/").then((response) => setConferences(response.data)).catch(() => setError("Unable to load conference choices.")); }, []);

  async function loadAnnouncements(id = conferenceId) {
    if (!id) { setError("Choose a conference first."); return; }
    try { setError(""); const response = await api.get("/announcements/", { params: { conference_id: Number(id) } }); setAnnouncements(response.data); } catch (caughtError: any) { setError(caughtError.response?.data?.detail || "Unable to load announcements."); setAnnouncements([]); }
  }

  async function createAnnouncement(event: FormEvent) {
    event.preventDefault();
    try {
      setLoading(true); setError("");
      await api.post("/announcements/", { ...form, conference_id: Number(form.conference_id), scheduled_for: form.scheduled_for || null });
      setConferenceId(form.conference_id);
      setForm(initialForm);
      await loadAnnouncements(form.conference_id);
    } catch (caughtError: any) { setError(caughtError.response?.data?.detail || "Unable to create the announcement."); } finally { setLoading(false); }
  }

  return <div className="module-page"><div className="page-heading"><div><p className="eyebrow">AUDIENCE COMMUNICATION</p><h1>Announcements</h1><p className="subtitle">Target and schedule conference communication without typing a raw conference ID.</p></div></div>{error && <div className="error">{error}</div>}<section className="form-panel"><h2>Create announcement</h2><form className="field-grid" onSubmit={createAnnouncement}><label>Conference<select value={form.conference_id} onChange={(event) => setForm({ ...form, conference_id: event.target.value })} required><option value="">Choose a conference</option>{conferences.map((conference) => <option key={conference.id} value={conference.id}>{conference.name}</option>)}</select></label><label>Audience<select value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value })}><option>all attendees</option><option>registered participants</option><option>speakers</option><option>reviewers</option></select></label><label className="span-two">Title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label><label className="span-two">Message<textarea rows={4} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} required /></label><label>Schedule for<input type="datetime-local" value={form.scheduled_for} onChange={(event) => setForm({ ...form, scheduled_for: event.target.value })} /></label><label>Delivery<select value={form.delivery_channel} onChange={(event) => setForm({ ...form, delivery_channel: event.target.value })}><option value="in-app">In-app</option><option value="email">Email</option></select></label><div className="span-two"><button disabled={loading}>{loading ? "Publishing..." : "Create announcement"}</button></div></form></section><section className="agenda-panel"><div className="section-heading"><div><h2>Conference announcements</h2><span>Filter by the conference name.</span></div><select value={conferenceId} onChange={(event) => { setConferenceId(event.target.value); loadAnnouncements(event.target.value); }}><option value="">Choose a conference</option>{conferences.map((conference) => <option key={conference.id} value={conference.id}>{conference.name}</option>)}</select></div>{announcements.length ? <div className="suggestion-list">{announcements.map((announcement) => <article className="suggestion" key={announcement.id}><div><h3>{announcement.title}</h3><p>{announcement.message}</p><small>Audience: {announcement.audience} | Delivery: {announcement.delivery_channel}{announcement.scheduled_for ? ` | Scheduled: ${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(announcement.scheduled_for))}` : ""}</small></div></article>)}</div> : <p className="empty-state">Choose a conference to view announcements.</p>}</section></div>;
}
