import { FormEvent, useEffect, useState } from "react";
import api from "../api";

type Conference = {
  id: number;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  location?: string;
  registration_fee: number;
  seat_capacity: number;
  registered_count: number;
  seats_remaining: number;
};

const initialForm = {
  name: "",
  description: "",
  start_date: "",
  end_date: "",
  location: "",
  registration_fee: "0",
  seat_capacity: "0",
};

function formatDate(value?: string) {
  return value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`)) : "Date to be announced";
}

export default function ConferencesPage() {
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadConferences() {
    try {
      setError("");
      const response = await api.get("/conferences/");
      setConferences(response.data);
    } catch (caughtError: any) {
      setError(caughtError.response?.data?.detail || "Unable to load conferences.");
    }
  }

  useEffect(() => { loadConferences(); }, []);

  async function createConference(event: FormEvent) {
    event.preventDefault();
    if (new Date(form.end_date) < new Date(form.start_date)) {
      setError("The end date must be on or after the start date.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      await api.post("/conferences/", {
        ...form,
        registration_fee: Number(form.registration_fee),
        seat_capacity: Number(form.seat_capacity),
      });
      setForm(initialForm);
      await loadConferences();
    } catch (caughtError: any) {
      setError(caughtError.response?.data?.detail || "Unable to create the conference.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="module-page">
    <div className="page-heading"><div><p className="eyebrow">CONFERENCE DIRECTORY</p><h1>Conferences</h1><p className="subtitle">Create and review the conferences that make up the event programme.</p></div><button className="secondary-button" onClick={loadConferences}>Refresh</button></div>
    {error && <div className="error">{error}</div>}
    <section className="form-panel"><h2>Create conference</h2><form className="field-grid" onSubmit={createConference}>
      <label>Conference name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
      <label>Location<input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} required /></label>
      <label>Start date<input type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} required /></label>
      <label>End date<input type="date" min={form.start_date} value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} required /></label>
      <label>Registration fee<input type="number" min="0" step="0.01" value={form.registration_fee} onChange={(event) => setForm({ ...form, registration_fee: event.target.value })} required /></label>
      <label>Total seats<input type="number" min="0" value={form.seat_capacity} onChange={(event) => setForm({ ...form, seat_capacity: event.target.value })} required /></label>
      <label className="span-two">Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} /></label>
      <div className="span-two"><button disabled={loading}>{loading ? "Creating..." : "Create conference"}</button></div>
    </form></section>
    <section><div className="section-heading"><h2>Available conferences</h2><span>{conferences.length} listed</span></div>{conferences.length ? <div className="conference-grid">{conferences.map((conference) => <article className="conference-card" key={conference.id}><div className="card-topline"><span>#{conference.id}</span><span>{conference.seats_remaining} seats left</span></div><h3>{conference.name}</h3><p>{conference.description || "No description has been added yet."}</p><dl><div><dt>When</dt><dd>{formatDate(conference.start_date)} to {formatDate(conference.end_date)}</dd></div><div><dt>Where</dt><dd>{conference.location || "Location to be announced"}</dd></div><div><dt>Fee</dt><dd>Rs. {conference.registration_fee.toFixed(2)}</dd></div><div><dt>Seats</dt><dd>{conference.registered_count} registered of {conference.seat_capacity || "TBA"}</dd></div></dl></article>)}</div> : <p className="empty-state">No conferences are available yet.</p>}</section>
  </div>;
}
