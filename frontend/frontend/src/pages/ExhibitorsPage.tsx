import { useEffect, useState } from "react";
import api from "./api";

const CONFERENCE_ID = 1;

interface Exhibitor {
  id: number;
  conference_id: number;
  name: string;
  booth_location: string | null;
  description: string | null;
}

export default function ExhibitorsPage() {
  const [exhibitors, setExhibitors] = useState<Exhibitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    name: "",
    booth_location: "",
    description: "",
  });

  const fetchExhibitors = async () => {
    try {
      const res = await api.get(`/exhibitors/?conference_id=${CONFERENCE_ID}`);
      setExhibitors(res.data);
    } catch {
      setError("Failed to load exhibitors.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExhibitors();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Exhibitor name is required.");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/exhibitors/", {
        conference_id: CONFERENCE_ID,
        name: form.name.trim(),
        booth_location: form.booth_location.trim() || null,
        description: form.description.trim() || null,
      });
      setSuccess("Exhibitor added successfully.");
      setForm({ name: "", booth_location: "", description: "" });
      fetchExhibitors();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to add exhibitor.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Exhibitor Management</h1>

      {/* ── Add Exhibitor Form ── */}
      <section style={styles.card}>
        <h2 style={styles.subheading}>Add Exhibitor</h2>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.row}>
            <label style={styles.label}>
              Exhibitor Name <span style={styles.required}>*</span>
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. TechStart Inc."
              style={styles.input}
            />
          </div>

          <div style={styles.row}>
            <label style={styles.label}>Booth / Location</label>
            <input
              name="booth_location"
              value={form.booth_location}
              onChange={handleChange}
              placeholder="e.g. Hall B, Booth 12 (optional)"
              style={styles.input}
            />
          </div>

          <div style={styles.row}>
            <label style={styles.label}>Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Brief description of the exhibitor (optional)"
              rows={3}
              style={styles.textarea}
            />
          </div>

          {error && <p style={styles.errorMsg}>{error}</p>}
          {success && <p style={styles.successMsg}>{success}</p>}

          <button type="submit" disabled={submitting} style={styles.btn}>
            {submitting ? "Adding…" : "Add Exhibitor"}
          </button>
        </form>
      </section>

      {/* ── Exhibitors Table ── */}
      <section style={styles.card}>
        <h2 style={styles.subheading}>Exhibitors for Conference #{CONFERENCE_ID}</h2>
        {loading ? (
          <p style={styles.muted}>Loading…</p>
        ) : exhibitors.length === 0 ? (
          <p style={styles.muted}>No exhibitors added yet.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                {["#", "Name", "Booth / Location", "Description"].map((h) => (
                  <th key={h} style={styles.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {exhibitors.map((ex, i) => (
                <tr key={ex.id} style={i % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                  <td style={styles.td}>{i + 1}</td>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{ex.name}</td>
                  <td style={styles.td}>
                    {ex.booth_location ? (
                      <span style={styles.boothBadge}>{ex.booth_location}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={{ ...styles.td, color: "#555" }}>
                    {ex.description ?? "—"}
                  </td>
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
  page: { padding: "2rem", maxWidth: 900, margin: "0 auto", fontFamily: "sans-serif" },
  heading: { fontSize: "1.6rem", fontWeight: 700, marginBottom: "1.5rem", color: "#1a1a2e" },
  subheading: { fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem", color: "#333" },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "1.5rem", marginBottom: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  form: { display: "flex", flexDirection: "column", gap: "0.85rem" },
  row: { display: "flex", flexDirection: "column", gap: "0.3rem" },
  label: { fontSize: "0.85rem", fontWeight: 600, color: "#555" },
  required: { color: "#e53e3e" },
  input: { padding: "0.5rem 0.75rem", border: "1px solid #cbd5e0", borderRadius: 6, fontSize: "0.95rem", outline: "none" },
  textarea: { padding: "0.5rem 0.75rem", border: "1px solid #cbd5e0", borderRadius: 6, fontSize: "0.95rem", resize: "vertical", fontFamily: "sans-serif" },
  btn: { alignSelf: "flex-start", padding: "0.55rem 1.4rem", background: "#0d9488", color: "#fff", border: "none", borderRadius: 7, fontWeight: 600, fontSize: "0.95rem", cursor: "pointer" },
  errorMsg: { color: "#c53030", fontSize: "0.875rem", margin: 0 },
  successMsg: { color: "#276749", fontSize: "0.875rem", margin: 0 },
  muted: { color: "#888", fontStyle: "italic" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "0.6rem 0.75rem", borderBottom: "2px solid #e2e8f0", fontSize: "0.85rem", fontWeight: 700, color: "#4a5568" },
  td: { padding: "0.6rem 0.75rem", fontSize: "0.9rem", color: "#2d3748", verticalAlign: "top" },
  rowEven: { background: "#fff" },
  rowOdd: { background: "#f8fafc" },
  boothBadge: { background: "#ebf8ff", color: "#2b6cb0", border: "1px solid #bee3f8", borderRadius: 10, padding: "0.15rem 0.6rem", fontSize: "0.82rem", fontWeight: 600 },
};
