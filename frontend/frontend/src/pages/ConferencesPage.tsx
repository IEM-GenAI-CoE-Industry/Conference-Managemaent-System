import { useEffect, useState } from "react";
import api from "../api";

type Conference = {
  id: number;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  location?: string;
  organizer_id?: number;
};

function ConferencesPage() {
  const isOrganizer = localStorage.getItem("role") === "organizer";
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [selectedConference, setSelectedConference] =
    useState<Conference | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    location: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load all conferences
  async function loadConferences() {
    try {
      setError("");
      const response = await api.get("/conferences/");
      setConferences(response.data);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Failed to load conferences."
      );
    }
  }

  // Create a conference
  async function createConference(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      await api.post("/conferences/", form);

      setForm({
        name: "",
        description: "",
        start_date: "",
        end_date: "",
        location: "",
      });

      await loadConferences();
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Failed to create conference."
      );
    } finally {
      setLoading(false);
    }
  }

  // Load one conference
  async function viewConference(id: number) {
    try {
      setError("");

      const response = await api.get(`/conferences/${id}`);
      setSelectedConference(response.data);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Failed to load conference details."
      );
    }
  }

  useEffect(() => {
    loadConferences();
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.heading}>{isOrganizer ? "Conference Management" : "Conferences"}</h1>

        {error && (
          <p style={styles.errorMessage}>
            {error}
          </p>
        )}

        {isOrganizer && <section style={styles.card}>
          <h2 style={styles.sectionTitle}>Create Conference</h2>

          <form onSubmit={createConference} style={styles.form}>
            <div style={styles.fieldRow}>
              <label style={styles.label}>Conference Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                style={styles.input}
              />
            </div>

            <div style={styles.fieldRow}>
              <label style={styles.label}>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                style={{ ...styles.input, minHeight: 120, resize: "vertical" }}
              />
            </div>

            <div style={styles.twoColumn}>
              <div style={styles.fieldRow}>
                <label style={styles.label}>Start Date</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.fieldRow}>
                <label style={styles.label}>End Date</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  required
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.fieldRow}>
              <label style={styles.label}>Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                required
                style={styles.input}
              />
            </div>

            <button type="submit" disabled={loading} style={styles.primaryButton}>
              {loading ? "Creating..." : "Create Conference"}
            </button>
          </form>
        </section>}

        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>Conferences</h2>

          {conferences.length === 0 ? (
            <p style={styles.emptyState}>No conferences found.</p>
          ) : (
            <ul style={styles.list}>
              {conferences.map((conference) => (
                <li key={conference.id} style={styles.listItem}>
                  <div>
                    <strong style={styles.itemTitle}>{conference.name}</strong>
                    <div style={styles.metaText}>
                      {conference.start_date} - {conference.end_date}
                    </div>
                  </div>
                  <button onClick={() => viewConference(conference.id)} style={styles.secondaryButton}>
                    View Details
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {selectedConference && (
          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Conference Details</h2>

            <div style={styles.detailGrid}>
              <p><strong>Name:</strong> {selectedConference.name}</p>
              <p><strong>Description:</strong> {selectedConference.description || "N/A"}</p>
              <p><strong>Start Date:</strong> {selectedConference.start_date || "N/A"}</p>
              <p><strong>End Date:</strong> {selectedConference.end_date || "N/A"}</p>
              <p><strong>Location:</strong> {selectedConference.location || "N/A"}</p>
              <p><strong>Organizer ID:</strong> {selectedConference.organizer_id ?? "N/A"}</p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "32px 20px",
    background: "linear-gradient(180deg, rgba(15,23,42,0.2), rgba(15,23,42,0.05))",
  },
  container: {
    width: "100%",
    maxWidth: "980px",
    display: "flex",
    flexDirection: "column",
    gap: "22px",
  },
  heading: {
    margin: 0,
    textAlign: "center",
    color: "#f8fafc",
    fontSize: "2rem",
  },
  card: {
    background: "linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.82))",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 20,
    padding: "24px 28px",
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.28)",
  },
  sectionTitle: {
    margin: "0 0 18px",
    color: "#f8fafc",
    fontSize: "1.5rem",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    maxWidth: 760,
    margin: "0 auto",
    width: "100%",
  },
  fieldRow: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  twoColumn: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 18,
  },
  label: {
    fontWeight: 700,
    color: "#e2e8f0",
    fontSize: 15,
  },
  input: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.2)",
    background: "rgba(15,23,42,0.76)",
    color: "#f8fafc",
    fontSize: 15,
    boxSizing: "border-box",
  },
  primaryButton: {
    width: "100%",
    maxWidth: 340,
    alignSelf: "center",
    padding: "14px 18px",
    border: "none",
    borderRadius: 12,
    background: "linear-gradient(135deg, #2563eb, #8b5cf6)",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
  errorMessage: {
    margin: 0,
    padding: "12px 14px",
    borderRadius: 12,
    background: "rgba(127,29,29,0.22)",
    border: "1px solid rgba(248,113,113,0.22)",
    color: "#fecaca",
  },
  emptyState: { color: "#cbd5e1", margin: 0 },
  list: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 },
  listItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    padding: "16px 18px",
    borderRadius: 14,
    background: "rgba(15,23,42,0.42)",
    border: "1px solid rgba(148,163,184,0.15)",
  },
  itemTitle: { color: "#f8fafc", fontSize: 18 },
  metaText: { color: "#cbd5e1", marginTop: 4 },
  secondaryButton: {
    padding: "10px 16px",
    borderRadius: 10,
    border: "1px solid rgba(148,163,184,0.2)",
    background: "rgba(51,65,85,0.72)",
    color: "#f8fafc",
    cursor: "pointer",
    fontWeight: 700,
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
    color: "#e2e8f0",
  },
};

export default ConferencesPage;