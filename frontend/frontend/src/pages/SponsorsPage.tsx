import { useEffect, useState } from "react";
import api from "./api";

const CONFERENCE_ID = 1;

type Tier = "gold" | "silver" | "bronze";

interface Sponsor {
  id: number;
  conference_id: number;
  name: string;
  tier: Tier;
  contact_email: string | null;
}

const TIER_COLORS: Record<Tier, string> = {
  gold: "#b8860b",
  silver: "#708090",
  bronze: "#8b4513",
};

const TIER_BG: Record<Tier, string> = {
  gold: "#fffbe6",
  silver: "#f5f5f5",
  bronze: "#fff3e0",
};

export default function SponsorsPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    name: "",
    tier: "gold" as Tier,
    contact_email: "",
  });

  const fetchSponsors = async () => {
    try {
      const res = await api.get(`/sponsors/?conference_id=${CONFERENCE_ID}`);
      setSponsors(res.data);
    } catch {
      setError("Failed to load sponsors.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSponsors();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Sponsor name is required.");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/sponsors/", {
        conference_id: CONFERENCE_ID,
        name: form.name.trim(),
        tier: form.tier,
        contact_email: form.contact_email.trim() || null,
      });
      setSuccess("Sponsor added successfully.");
      setForm({ name: "", tier: "gold", contact_email: "" });
      fetchSponsors();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to add sponsor.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Sponsor Management</h1>

      {/* ── Add Sponsor Form ── */}
      <section style={styles.card}>
        <h2 style={styles.subheading}>Add Sponsor</h2>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.row}>
            <label style={styles.label}>
              Sponsor Name <span style={styles.required}>*</span>
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Acme Corp"
              style={styles.input}
            />
          </div>

          <div style={styles.row}>
            <label style={styles.label}>Tier</label>
            <select
              name="tier"
              value={form.tier}
              onChange={handleChange}
              style={styles.select}
            >
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
              <option value="bronze">Bronze</option>
            </select>
          </div>

          <div style={styles.row}>
            <label style={styles.label}>Contact Email</label>
            <input
              name="contact_email"
              type="email"
              value={form.contact_email}
              onChange={handleChange}
              placeholder="contact@sponsor.com (optional)"
              style={styles.input}
            />
          </div>

          {error && <p style={styles.errorMsg}>{error}</p>}
          {success && <p style={styles.successMsg}>{success}</p>}

          <button type="submit" disabled={submitting} style={styles.btn}>
            {submitting ? "Adding…" : "Add Sponsor"}
          </button>
        </form>
      </section>

      {/* ── Sponsors Table ── */}
      <section style={styles.card}>
        <h2 style={styles.subheading}>Sponsors for Conference #{CONFERENCE_ID}</h2>
        {loading ? (
          <p style={styles.muted}>Loading…</p>
        ) : sponsors.length === 0 ? (
          <p style={styles.muted}>No sponsors added yet.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                {["#", "Name", "Tier", "Contact Email"].map((h) => (
                  <th key={h} style={styles.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sponsors.map((s, i) => (
                <tr key={s.id} style={i % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                  <td style={styles.td}>{i + 1}</td>
                  <td style={styles.td}>{s.name}</td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.badge,
                        color: TIER_COLORS[s.tier],
                        background: TIER_BG[s.tier],
                        border: `1px solid ${TIER_COLORS[s.tier]}`,
                      }}
                    >
                      {s.tier.charAt(0).toUpperCase() + s.tier.slice(1)}
                    </span>
                  </td>
                  <td style={styles.td}>{s.contact_email ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "2rem", maxWidth: 860, margin: "0 auto", fontFamily: "sans-serif" },
  heading: { fontSize: "1.6rem", fontWeight: 700, marginBottom: "1.5rem", color: "#1a1a2e" },
  subheading: { fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem", color: "#333" },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "1.5rem", marginBottom: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  form: { display: "flex", flexDirection: "column", gap: "0.85rem" },
  row: { display: "flex", flexDirection: "column", gap: "0.3rem" },
  label: { fontSize: "0.85rem", fontWeight: 600, color: "#555" },
  required: { color: "#e53e3e" },
  input: { padding: "0.5rem 0.75rem", border: "1px solid #cbd5e0", borderRadius: 6, fontSize: "0.95rem", outline: "none" },
  select: { padding: "0.5rem 0.75rem", border: "1px solid #cbd5e0", borderRadius: 6, fontSize: "0.95rem", background: "#fff" },
  btn: { alignSelf: "flex-start", padding: "0.55rem 1.4rem", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 7, fontWeight: 600, fontSize: "0.95rem", cursor: "pointer" },
  errorMsg: { color: "#c53030", fontSize: "0.875rem", margin: 0 },
  successMsg: { color: "#276749", fontSize: "0.875rem", margin: 0 },
  muted: { color: "#888", fontStyle: "italic" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "0.6rem 0.75rem", borderBottom: "2px solid #e2e8f0", fontSize: "0.85rem", fontWeight: 700, color: "#4a5568" },
  td: { padding: "0.6rem 0.75rem", fontSize: "0.9rem", color: "#2d3748" },
  rowEven: { background: "#fff" },
  rowOdd: { background: "#f8fafc" },
  badge: { padding: "0.2rem 0.65rem", borderRadius: 12, fontSize: "0.78rem", fontWeight: 700, display: "inline-block" },
};
