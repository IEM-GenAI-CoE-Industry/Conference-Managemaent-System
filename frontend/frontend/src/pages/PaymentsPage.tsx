import { useEffect, useMemo, useState } from "react";
import api from "../api";

type Registration = { id: number; conference_name: string; category: string; fee: number; payment_status: string };
type Payment = { id: number; registration_id: number; conference_name: string; conference_id?: number; category: string; amount: number; currency: string; status: string; gateway_order_id?: string; gateway_payment_id?: string; failure_reason?: string; attendee_name?: string; attendee_email?: string; attendee_role?: string; created_at?: string; confirmed_at?: string };
type Summary = { transactions: number; paid_count: number; pending_count: number; failed_count: number; refunded_count: number; collected: number; refunded: number; currency: string };

const money = (value: number) => `INR ${value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export default function PaymentsPage() {
  const organizer = localStorage.getItem("role") === "organizer";
  return organizer ? <OrganizerPayments /> : <AttendeePayments />;
}

function OrganizerPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    try {
      const response = await api.get("/payments/manage");
      setPayments(response.data.payments); setSummary(response.data.summary);
    } catch (error: any) { setMessage(error.response?.data?.detail || "Could not load the payment ledger."); }
  };
  useEffect(() => { void load(); }, []);

  const visible = useMemo(() => payments.filter((payment) => {
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    const text = `${payment.attendee_name} ${payment.attendee_email} ${payment.conference_name} ${payment.gateway_payment_id || payment.gateway_order_id}`.toLowerCase();
    return matchesStatus && text.includes(query.trim().toLowerCase());
  }), [payments, statusFilter, query]);

  const refund = async (payment: Payment) => {
    if (!window.confirm(`Refund ${money(payment.amount)} to ${payment.attendee_name}? This will cancel the registration.`)) return;
    setBusyId(payment.id); setMessage("");
    try { await api.post(`/payments/${payment.id}/refund`); setMessage("Refund recorded and the attendee registration was cancelled."); await load(); }
    catch (error: any) { setMessage(error.response?.data?.detail || "Refund could not be processed."); }
    finally { setBusyId(null); }
  };

  return <main style={s.page}>
    <header><p style={s.eyebrow}>Organizer finance</p><h1 style={s.title}>Payment management</h1><p style={s.muted}>Monitor registration payments for conferences you organize, verify gateway references, download receipts, and record refunds.</p></header>
    {message && <p role="status" style={s.notice}>{message}</p>}
    {summary && <section style={s.metrics}>
      <Metric label="Collected" value={money(summary.collected)} /><Metric label="Paid" value={String(summary.paid_count)} /><Metric label="Pending" value={String(summary.pending_count)} /><Metric label="Failed / cancelled" value={String(summary.failed_count)} /><Metric label="Refunded" value={money(summary.refunded)} />
    </section>}
    <section style={s.card}>
      <div style={s.toolbar}><label style={s.label}>Search<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Attendee, conference or transaction" style={s.input} /></label><label style={s.label}>Status<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={s.input}><option value="all">All statuses</option><option value="paid">Paid</option><option value="pending">Pending</option><option value="failed">Failed</option><option value="cancelled">Cancelled</option><option value="refunded">Refunded</option></select></label></div>
      <div style={{ overflowX: "auto" }}><table style={s.table}><thead><tr><th style={s.th}>Attendee</th><th style={s.th}>Conference</th><th style={s.th}>Amount</th><th style={s.th}>Status</th><th style={s.th}>Gateway reference</th><th style={s.th}>Date</th><th style={s.th}>Actions</th></tr></thead><tbody>{visible.map((payment) => <tr key={payment.id} style={s.tr}><td style={s.td}><strong>{payment.attendee_name}</strong><small style={s.small}>{payment.attendee_email}<br />{payment.attendee_role}</small></td><td style={s.td}>{payment.conference_name}<small style={s.small}>{payment.category}</small></td><td style={s.td}>{money(payment.amount)}</td><td style={s.td}><Status value={payment.status} /></td><td style={s.td}><code>{payment.gateway_payment_id || payment.gateway_order_id || "—"}</code></td><td style={s.td}>{payment.confirmed_at ? new Date(payment.confirmed_at).toLocaleString() : payment.created_at ? new Date(payment.created_at).toLocaleString() : "—"}</td><td style={s.td}><div style={s.actions}>{["paid", "refunded"].includes(payment.status) && <button onClick={() => downloadReceipt(payment.id, setMessage)} style={s.textButton}>Receipt</button>}{payment.status === "paid" && <button disabled={busyId === payment.id} onClick={() => refund(payment)} style={s.danger}>{busyId === payment.id ? "Refunding…" : "Refund"}</button>}</div></td></tr>)}</tbody></table></div>
      {visible.length === 0 && <p style={s.empty}>No payments match these filters.</p>}
    </section>
  </main>;
}

function AttendeePayments() {
  const [registrations, setRegistrations] = useState<Registration[]>([]); const [payments, setPayments] = useState<Payment[]>([]); const [selected, setSelected] = useState(""); const [message, setMessage] = useState(""); const [checkout, setCheckout] = useState<Payment | null>(null); const [busy, setBusy] = useState(false);
  const load = async () => { try { const [r, p] = await Promise.all([api.get("/registrations/me"), api.get("/payments/me")]); setRegistrations(r.data); setPayments(p.data); const eligible = r.data.find((x: Registration) => x.fee > 0 && x.payment_status !== "paid"); if (eligible && !selected) setSelected(String(eligible.id)); } catch (error: any) { setMessage(error.response?.data?.detail || "Could not load payments."); } };
  useEffect(() => { void load(); }, []);
  const start = async () => { setBusy(true); setMessage(""); try { setCheckout((await api.post("/payments/", { registration_id: Number(selected) })).data); } catch (error: any) { setMessage(error.response?.data?.detail || "Could not start checkout."); } finally { setBusy(false); } };
  const finish = async (outcome: "success" | "failed" | "cancelled") => { if (!checkout) return; setBusy(true); try { const response = await api.post(`/payments/${checkout.id}/gateway-callback`, { outcome }); setCheckout(null); setMessage(response.data.status === "paid" ? "Payment verified. Your registration is confirmed and receipt is ready." : response.data.failure_reason); await load(); } catch (error: any) { setMessage(error.response?.data?.detail || "Gateway response could not be verified."); } finally { setBusy(false); } };
  const due = registrations.filter((r) => r.fee > 0 && r.payment_status !== "paid"); const chosen = due.find((r) => String(r.id) === selected);
  return <main style={s.page}><header><p style={s.eyebrow}>Participant / author finance</p><h1 style={s.title}>Registration payments</h1><p style={s.muted}>Choose one of your registrations. The payable amount comes from the college fee card and cannot be edited.</p></header>{message && <p role="status" style={s.notice}>{message}</p>}
    <section style={s.card}><h2>Pay registration fee</h2>{due.length === 0 ? <p style={s.muted}>No unpaid registration fees.</p> : <><label style={s.label}>Registration<select value={selected} onChange={(e) => setSelected(e.target.value)} style={s.input}>{due.map((r) => <option key={r.id} value={r.id}>{r.conference_name} · {r.category} · {money(r.fee)}</option>)}</select></label>{chosen && <div style={s.summary}><span>Total payable</span><strong style={{ fontSize: 24 }}>{money(chosen.fee)}</strong><small>Taxes included · server verified</small></div>}<button onClick={start} disabled={busy || !selected} style={s.button}>Proceed to secure checkout</button></>}</section>
    {checkout && <div style={s.overlay}><section style={s.checkout}><p style={s.eyebrow}>College Demo Gateway</p><h2>Pay {money(checkout.amount)}</h2><p>{checkout.conference_name}</p><p style={{ color: "#475569" }}>Order {checkout.gateway_order_id}</p><div style={s.methods}><button onClick={() => finish("success")} disabled={busy} style={s.button}>Pay with UPI / card</button><button onClick={() => finish("failed")} disabled={busy} style={s.lightSecondary}>Simulate bank decline</button><button onClick={() => finish("cancelled")} disabled={busy} style={s.lightSecondary}>Cancel</button></div><small style={{ color: "#475569" }}>Demo gateway: production callbacks must be signed and verified by the approved college payment provider.</small></section></div>}
    <section style={s.card}><h2>Payment history</h2>{payments.length === 0 ? <p style={s.muted}>No transactions yet.</p> : payments.map((p) => <article key={p.id} style={s.row}><div><strong>{p.conference_name}</strong><div style={s.muted}>{p.category} · {p.gateway_payment_id || p.gateway_order_id}</div></div><div style={{ textAlign: "right" }}><strong>{money(p.amount)}</strong><div><Status value={p.status} /></div>{["paid", "refunded"].includes(p.status) && <button onClick={() => downloadReceipt(p.id, setMessage)} style={s.textButton}>Download receipt</button>}</div></article>)}</section>
  </main>;
}

function Metric({ label, value }: { label: string; value: string }) { return <article style={s.metric}><span style={s.muted}>{label}</span><strong style={{ fontSize: 22 }}>{value}</strong></article>; }
function Status({ value }: { value: string }) { return <span style={{ ...s.status, background: value === "paid" ? "#14532d" : value === "pending" ? "#713f12" : value === "refunded" ? "#1e3a8a" : "#7f1d1d" }}>{value}</span>; }
async function downloadReceipt(id: number, setMessage: (value: string) => void) { try { const { data: x } = await api.get(`/payments/${id}/receipt`); const body = `COLLEGE CONFERENCE RECEIPT\n${x.receipt_number}\nPayer: ${x.payer}\n${x.conference_name}\n${x.category}\nAmount: ${money(x.amount)}\nStatus: ${x.status}\nTransaction: ${x.gateway_payment_id}`; const url = URL.createObjectURL(new Blob([body], { type: "text/plain" })); const a = document.createElement("a"); a.href = url; a.download = `${x.receipt_number}.txt`; a.click(); URL.revokeObjectURL(url); } catch (error: any) { setMessage(error.response?.data?.detail || "Receipt unavailable."); } }

const s: Record<string, React.CSSProperties> = { page: { maxWidth: 1200, margin: "0 auto", display: "grid", gap: 20 }, eyebrow: { color: "#67e8f9", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".12em" }, title: { color: "#f8fafc" }, muted: { color: "#94a3b8" }, notice: { padding: 14, borderRadius: 10, background: "#164e63", color: "#cffafe" }, metrics: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }, metric: { display: "grid", gap: 8, padding: 18, background: "#0f172a", color: "#f8fafc", border: "1px solid #334155", borderRadius: 12 }, card: { padding: 24, border: "1px solid #334155", borderRadius: 16, background: "#0f172a", color: "#f8fafc" }, toolbar: { display: "grid", gridTemplateColumns: "minmax(250px,2fr) minmax(180px,1fr)", gap: 14, marginBottom: 22 }, label: { display: "grid", gap: 8, fontWeight: 700 }, input: { padding: 13, borderRadius: 8, border: "1px solid #64748b", background: "#111827", color: "white" }, summary: { display: "grid", gap: 4, margin: "18px 0", padding: 16, borderRadius: 10, background: "#172554" }, button: { padding: "12px 18px", border: 0, borderRadius: 8, background: "#2563eb", color: "white", fontWeight: 800, cursor: "pointer" }, row: { display: "flex", justifyContent: "space-between", gap: 16, padding: "16px 0", borderTop: "1px solid #334155" }, textButton: { border: 0, background: "transparent", color: "#67e8f9", cursor: "pointer", padding: 0, fontWeight: 700 }, danger: { padding: "7px 10px", border: "1px solid #ef4444", borderRadius: 6, background: "transparent", color: "#fca5a5", cursor: "pointer" }, status: { display: "inline-block", padding: "4px 8px", borderRadius: 999, color: "white", fontSize: 12, textTransform: "capitalize" }, table: { width: "100%", borderCollapse: "collapse", minWidth: 980 }, th: { padding: "10px", textAlign: "left", color: "#94a3b8", fontSize: 12, textTransform: "uppercase", borderBottom: "1px solid #475569" }, td: { padding: "14px 10px", verticalAlign: "top" }, tr: { borderBottom: "1px solid #334155" }, small: { display: "block", marginTop: 4, color: "#94a3b8" }, actions: { display: "flex", alignItems: "center", gap: 10 }, empty: { padding: 24, textAlign: "center", color: "#94a3b8" }, overlay: { position: "fixed", inset: 0, display: "grid", placeItems: "center", background: "rgba(2,6,23,.78)", zIndex: 20 }, checkout: { width: "min(440px,90vw)", padding: 28, borderRadius: 18, background: "white", color: "#0f172a", boxShadow: "0 24px 70px #000" }, methods: { display: "grid", gap: 10, margin: "20px 0" }, lightSecondary: { padding: "11px 16px", border: "1px solid #64748b", borderRadius: 8, background: "white", color: "#0f172a", cursor: "pointer" } };
