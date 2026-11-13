import { useEffect, useState } from "react";
import api from "../api";
import "./RegistrationPage.css";

type Conference = { id: number; name?: string; title?: string; description?: string; location?: string; start_date?: string; end_date?: string };
type RegistrationResponse = { id: number; user_id: number; conference_id: number; category: string; status: string; created_at: string };
export default function RegistrationPage() {
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [conferenceId, setConferenceId] = useState(localStorage.getItem("selected_conference_id") || "");
  const [category, setCategory] = useState(localStorage.getItem("role") === "author" ? "author" : "participant");
  const [loading, setLoading] = useState(false); const [loadingConferences, setLoadingConferences] = useState(true);
  const [message, setMessage] = useState(""); const [registration, setRegistration] = useState<RegistrationResponse | null>(null);
  useEffect(() => { api.get("/conferences/").then(r => { const list: Conference[] = r.data ?? []; setConferences(list); const selected = list.some(c => String(c.id) === conferenceId) ? conferenceId : (list[0] ? String(list[0].id) : ""); setConferenceId(selected); if (selected) localStorage.setItem("selected_conference_id", selected); }).catch(e => setMessage(e?.message || "Unable to load conferences.")).finally(() => setLoadingConferences(false)); }, []);
  const selected = conferences.find(c => String(c.id) === conferenceId);
  async function handleRegister() { if (!conferenceId) { setMessage("Choose a conference before registering."); return; } setLoading(true); setMessage(""); setRegistration(null); try { const response = await api.post("/registrations/", { conference_id: Number(conferenceId), category }); setRegistration(response.data); setMessage("Registration successful!"); } catch (error: any) { setMessage(error?.response?.data?.detail || error?.message || "Registration failed. Please try again."); } finally { setLoading(false); } }
  return <div className="registration-page"><div className="registration-card"><h1>Conference Registration</h1><p className="subtitle">Choose a conference from the live list.</p>
    <label htmlFor="conference-picker">Conference</label><select id="conference-picker" value={conferenceId} disabled={loadingConferences || conferences.length === 0} onChange={e => { setConferenceId(e.target.value); localStorage.setItem("selected_conference_id", e.target.value); setRegistration(null); setMessage(""); }}><option value="">Select a conference</option>{conferences.map(c => <option key={c.id} value={c.id}>{c.name || c.title || `Conference #${c.id}`}</option>)}</select>
    {loadingConferences ? <p role="status">Loading conferences…</p> : !conferences.length ? <p role="status">No conferences are currently available for registration.</p> : selected && <div className="conference-info"><h2>{selected.name || selected.title}</h2><p>{selected.description || "Conference registration"}</p><p>{selected.location || "Location to be announced"}</p><p>{selected.start_date || "Date to be announced"}{selected.end_date ? ` – ${selected.end_date}` : ""}</p></div>}
    <label htmlFor="category-picker">Registration category</label><select id="category-picker" value={category} onChange={e => setCategory(e.target.value)}><option value="participant">Participant</option><option value="author">Author</option><option value="speaker">Speaker</option></select>
    <button className="register-button" disabled={loading || !conferenceId} onClick={handleRegister}>{loading ? "Registering…" : "Register Now"}</button>
    {message && <p role={registration ? "status" : "alert"}>{message}</p>}{registration && <p>Registration ID: {registration.id} · Status: {registration.status}</p>}
  </div></div>;
}
