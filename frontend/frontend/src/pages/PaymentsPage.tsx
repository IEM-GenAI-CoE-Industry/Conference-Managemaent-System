import { useEffect, useState } from "react";
import api from "../api";

type Payment = { id: number; registration_id: number; amount: number; status: string };

export default function PaymentsPage() {
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
  return <main style={styles.page}><h1>Payments</h1>{message && <p>{message}</p>}
    <section style={styles.section}><h2>Create Payment</h2><form onSubmit={create} style={styles.form}><input required type="number" min="1" placeholder="Registration ID" value={registrationId} onChange={(e) => setRegistrationId(e.target.value)} /><input required type="number" min="1" step="0.01" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} /><button>Create Payment</button></form></section>
    <section style={styles.section}><h2>Confirm Payment</h2><form onSubmit={confirm} style={styles.form}><input required type="number" min="1" placeholder="Payment ID" value={confirmId} onChange={(e) => setConfirmId(e.target.value)} /><button>Confirm</button></form></section>
    <section style={styles.section}><h2>My Payments</h2>{payments.length ? <ul>{payments.map((payment) => <li key={payment.id}>Payment #{payment.id}: registration #{payment.registration_id}, {payment.amount}, {payment.status}</li>)}</ul> : <p>No payments found.</p>}</section>
  </main>;
}
const styles: Record<string, React.CSSProperties> = { page: { padding: 32 }, section: { marginTop: 20, padding: 20, border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff" }, form: { display: "flex", gap: 10, flexWrap: "wrap" } };
