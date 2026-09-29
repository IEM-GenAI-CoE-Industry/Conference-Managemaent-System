import { useEffect, useState } from "react";
import api from "../api";

type Payment = { id: number; registration_id: number; amount: number; status: string };

export default function PaymentsPage() {
  const isOrganizer = localStorage.getItem("role") === "organizer";
  const [payments, setPayments] = useState<Payment[]>([]);
  const [registrationId, setRegistrationId] = useState("");
  const [amount, setAmount] = useState("");
  const [confirmId, setConfirmId] = useState("");
  const [message, setMessage] = useState("");
  const load = async () => {
    try { setPayments((await api.get<Payment[]>("/payments/me")).data); }
    catch (error: any) { setMessage(error.response?.data?.detail || "Unable to load payments."); }
  };
  useEffect(() => { load(); }, []);
  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    try { await api.post("/payments/", { registration_id: Number(registrationId), amount: Number(amount) }); setMessage("Payment created."); setRegistrationId(""); setAmount(""); load(); }
    catch (error: any) { setMessage(error.response?.data?.detail || "Unable to create payment."); }
  };
  const confirm = async (event: React.FormEvent) => {
    event.preventDefault();
    try { await api.post(`/payments/${Number(confirmId)}/confirm`); setMessage("Payment confirmed."); setConfirmId(""); load(); }
    catch (error: any) { setMessage(error.response?.data?.detail || "Unable to confirm payment."); }
  };
  return (
    <main style={styles.page}>
      <header style={styles.header}><p style={styles.eyebrow}>Billing</p><h1 style={styles.title}>Payments</h1></header>
      {message && <p role="status" style={styles.message}>{message}</p>}
      <div style={styles.grid}>
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Create Payment</h2>
          <form onSubmit={create} style={styles.form}>
            <label style={styles.label}>Registration ID<input required type="number" min="1" placeholder="e.g. 12" value={registrationId} onChange={(e) => setRegistrationId(e.target.value)} style={styles.input} /></label>
            <label style={styles.label}>Amount<input required type="number" min="1" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} style={styles.input} /></label>
            <button style={styles.button}>Create Payment</button>
          </form>
        </section>
        {isOrganizer && <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Confirm Payment</h2>
          <form onSubmit={confirm} style={styles.form}>
            <label style={styles.label}>Payment ID<input required type="number" min="1" placeholder="e.g. 24" value={confirmId} onChange={(e) => setConfirmId(e.target.value)} style={styles.input} /></label>
            <button style={styles.button}>Confirm Payment</button>
          </form>
        </section>}
      </div>
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>My Payments</h2>
        {payments.length ? <ul style={styles.list}>{payments.map((payment) => <li key={payment.id} style={styles.listItem}><strong>Payment #{payment.id}</strong><span>Registration #{payment.registration_id}</span><span>{Number(payment.amount).toFixed(2)}</span><span style={styles.status}>{payment.status}</span></li>)}</ul> : <p style={styles.empty}>No payments found.</p>}
      </section>
    </main>
  );
}
const styles: Record<string, React.CSSProperties> = {
  page: { width: "100%", maxWidth: 1100, margin: "0 auto", padding: "12px 0 40px" },
  header: { marginBottom: 24 },
  eyebrow: { margin: "0 0 6px", color: "#67e8f9", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em" },
  title: { margin: 0, color: "#f8fafc", fontSize: 34 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: 18 },
  section: { marginTop: 18, padding: 24, border: "1px solid rgba(148,163,184,0.2)", borderRadius: 14, background: "linear-gradient(145deg, rgba(15,23,42,0.96), rgba(30,41,59,0.88))", boxShadow: "0 16px 32px rgba(2,6,23,0.22)" },
  sectionTitle: { margin: "0 0 18px", color: "#f8fafc", fontSize: 21 },
  form: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 16, alignItems: "end" },
  label: { display: "grid", gap: 8, color: "#dbeafe", fontWeight: 700, fontSize: 14 },
  input: { width: "100%", minHeight: 50, padding: "12px 14px", color: "#f8fafc", background: "#0b1220", border: "1px solid #475569", borderRadius: 8, fontSize: 16, boxSizing: "border-box" },
  button: { minHeight: 50, padding: "12px 18px", border: 0, borderRadius: 8, background: "#0e7490", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer" },
  message: { padding: "12px 16px", color: "#fef3c7", background: "rgba(146,64,14,0.24)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 8 },
  list: { display: "grid", gap: 10, listStyle: "none", margin: 0, padding: 0 },
  listItem: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, alignItems: "center", padding: "14px 16px", color: "#e2e8f0", background: "rgba(2,6,23,0.38)", border: "1px solid rgba(148,163,184,0.14)", borderRadius: 8 },
  status: { color: "#a5f3fc", textTransform: "capitalize", fontWeight: 700 },
  empty: { color: "#cbd5e1", margin: 0 },
};
