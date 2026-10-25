import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./RegistrationPage.css";

type Conference = { id: number; name: string; start_date?: string; location?: string };
type Category = { value: string; label: string; fee: number; currency: string };
type Registration = { id: number; conference_name: string; category: string; status: string; fee: number; currency: string; payment_status: string };

export default function RegistrationPage() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role") || "participant";
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [conferenceId, setConferenceId] = useState("");
  const [category, setCategory] = useState(role === "author" ? "author" : "participant");
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [options, mine] = await Promise.all([api.get("/registrations/options"), api.get("/registrations/me")]);
      setConferences(options.data.conferences); setCategories(options.data.categories); setRegistrations(mine.data);
      if (!conferenceId && options.data.conferences[0]) setConferenceId(String(options.data.conferences[0].id));
      if (!options.data.categories.some((item: Category) => item.value === category)) setCategory(options.data.categories[0]?.value || "participant");
    } catch (error: any) { setMessage(error.response?.data?.detail || "Could not load registration details."); }
  };
  useEffect(() => { void load(); }, []);
  const selectedCategory = useMemo(() => categories.find((item) => item.value === category), [categories, category]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try { await api.post("/registrations/", { conference_id: Number(conferenceId), category }); setMessage("Registration created. Your amount and payment status are shown below."); await load(); }
    catch (error: any) { const detail = error.response?.data?.detail; setMessage(typeof detail === "string" ? detail : detail?.message || "Registration could not be completed."); }
    finally { setBusy(false); }
  };

  return <main className="registration-page"><div className="registration-card">
    <p style={styles.eyebrow}>{role} portal</p><h1>{role === "author" ? "Author conference registration" : "Conference registration"}</h1>
    <p className="subtitle">Choose a live conference and see the college-approved fee before confirming. No internal IDs need to be typed.</p>
    {message && <p role="status" style={styles.message}>{message}</p>}
    <form onSubmit={submit} style={styles.form}>
      <label style={styles.label}>Conference<select required value={conferenceId} onChange={(e) => setConferenceId(e.target.value)} style={styles.input}>{conferences.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.start_date || "Date TBA"} · {c.location || "Venue TBA"}</option>)}</select></label>
      <label style={styles.label}>Registration category<select value={category} onChange={(e) => setCategory(e.target.value)} style={styles.input}>{categories.map((c) => <option key={c.value} value={c.value}>{c.label} — {c.fee ? `₹${c.fee.toLocaleString("en-IN")}` : "Fee waived"}</option>)}</select></label>
      <div style={styles.fee}><span>Amount due</span><strong>{selectedCategory?.fee ? `₹${selectedCategory.fee.toLocaleString("en-IN")}` : "₹0 (waived)"}</strong><small>The final amount is calculated securely by the server.</small></div>
      <button className="register-button" disabled={busy || !conferenceId}>{busy ? "Registering…" : "Confirm registration"}</button>
    </form>
    <section style={{marginTop: 28}}><h2>My registrations</h2>{registrations.length === 0 ? <p>No registrations yet.</p> : registrations.map((r) => <article key={r.id} style={styles.row}><div><strong>{r.conference_name}</strong><div>{r.category} · {r.status}</div></div><div style={{textAlign:"right"}}><strong>{r.fee ? `₹${r.fee.toLocaleString("en-IN")}` : "Fee waived"}</strong><div>Payment: {r.payment_status.replace("_", " ")}</div>{r.fee > 0 && r.payment_status !== "paid" && <button type="button" onClick={() => navigate("/payments")} style={styles.link}>Continue to payment</button>}</div></article>)}</section>
  </div></main>;
}

const styles: Record<string, React.CSSProperties> = {
  eyebrow:{color:"#2563eb",fontWeight:800,textTransform:"uppercase",letterSpacing:".1em"}, message:{padding:12,borderRadius:8,background:"#e0f2fe",color:"#075985"}, form:{display:"grid",gap:18,marginTop:24}, label:{display:"grid",gap:8,fontWeight:700}, input:{width:"100%",padding:12,border:"1px solid #cbd5e1",borderRadius:8,background:"white"}, fee:{display:"grid",gap:5,padding:16,borderRadius:10,background:"#eff6ff",color:"#1e3a8a"}, row:{display:"flex",justifyContent:"space-between",gap:20,padding:"16px 0",borderTop:"1px solid #e2e8f0"}, link:{marginTop:8,border:0,background:"transparent",color:"#2563eb",fontWeight:700,cursor:"pointer"}
};
