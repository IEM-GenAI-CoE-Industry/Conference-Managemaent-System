import { useEffect, useState } from "react";
import api from "../api";

type Announcement = {
  id: number;
  title: string;
  message: string;
  conference_id: number;
  created_at?: string;
};

function AnnouncementsPage() {
  const isOrganizer = localStorage.getItem("role") === "organizer";
  const [conferenceId, setConferenceId] = useState("");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [form, setForm] = useState({
    title: "",
    message: "",
    conference_id: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadAnnouncements() {
    if (!conferenceId) {
      setError("Please enter a conference ID.");
      return;
    }

    try {
      setError("");

      const response = await api.get("/announcements/", {
        params: {
          conference_id: Number(conferenceId),
        },
      });

      setAnnouncements(response.data);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          "Failed to load announcements."
      );
      setAnnouncements([]);
    }
  }

  async function createAnnouncement(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      await api.post("/announcements/", {
        title: form.title,
        message: form.message,
        conference_id: Number(form.conference_id),
      });

      const createdConferenceId = form.conference_id;

      setForm({
        title: "",
        message: "",
        conference_id: "",
      });

      setConferenceId(createdConferenceId);

      await loadAnnouncements();
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          "Failed to create announcement."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (form.conference_id) {
      setConferenceId(form.conference_id);
    }
  }, [form.conference_id]);

  return (
    <main style={styles.page}>
      <div style={styles.content}>
        <header style={styles.header}>
          <p style={styles.eyebrow}>Conference updates</p>
          <h1 style={styles.title}>Announcements</h1>
        </header>

        {error && <p role="alert" style={styles.error}>{error}</p>}

        {isOrganizer && <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Create Announcement</h2>
          <form onSubmit={createAnnouncement} style={styles.form}>
            <label style={styles.label}>
              Title
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                style={styles.input}
                placeholder="Announcement title"
              />
            </label>
            <label style={styles.label}>
              Content
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={6}
                required
                style={styles.textarea}
                placeholder="Write the update for conference attendees"
              />
            </label>
            <label style={styles.label}>
              Conference ID
              <input
                type="number"
                min="1"
                value={form.conference_id}
                onChange={(e) => setForm({ ...form, conference_id: e.target.value })}
                required
                style={styles.input}
                placeholder="Enter conference ID"
              />
            </label>
            <button type="submit" disabled={loading} style={styles.primaryButton}>
              {loading ? "Creating..." : "Create Announcement"}
            </button>
          </form>
        </section>}

        <section style={styles.section}>
          <div style={styles.listHeader}>
            <h2 style={styles.sectionTitle}>Conference Announcements</h2>
            <form onSubmit={(event) => { event.preventDefault(); loadAnnouncements(); }} style={styles.lookupForm}>
              <label style={styles.lookupLabel}>
                Conference ID
                <input
                  type="number"
                  min="1"
                  placeholder="Conference ID"
                  value={conferenceId}
                  onChange={(e) => setConferenceId(e.target.value)}
                  style={styles.lookupInput}
                />
              </label>
              <button type="submit" style={styles.secondaryButton}>Load</button>
            </form>
          </div>

          {announcements.length === 0 ? (
            <p style={styles.emptyState}>No announcements found for this conference.</p>
          ) : (
            <ul style={styles.announcementList}>
              {announcements.map((announcement) => (
                <li key={announcement.id} style={styles.announcement}>
                  <h3 style={styles.announcementTitle}>{announcement.title}</h3>
                  <p style={styles.message}>{announcement.message}</p>
                  <div style={styles.meta}>
                    <span>Conference {announcement.conference_id}</span>
                    {announcement.created_at && <time>{new Date(announcement.created_at).toLocaleString()}</time>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { width: "100%", padding: "16px 12px 48px" },
  content: { width: "100%", maxWidth: 960, margin: "0 auto", display: "grid", gap: 22 },
  header: { textAlign: "center", marginBottom: 4 },
  eyebrow: { margin: "0 0 6px", color: "#67e8f9", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em" },
  title: { margin: 0, color: "#f8fafc", fontSize: 34 },
  section: { width: "100%", padding: "26px clamp(18px, 4vw, 40px)", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 12, background: "linear-gradient(145deg, rgba(15,23,42,0.96), rgba(30,41,59,0.88))", boxShadow: "0 16px 32px rgba(2,6,23,0.22)" },
  sectionTitle: { margin: 0, color: "#f8fafc", fontSize: 22 },
  form: { width: "100%", maxWidth: 760, margin: "22px auto 0", display: "grid", gap: 20 },
  label: { display: "grid", gap: 9, color: "#e2e8f0", fontSize: 15, fontWeight: 700 },
  input: { width: "100%", minHeight: 54, padding: "13px 15px", border: "1px solid #475569", borderRadius: 8, background: "#0b1220", color: "#f8fafc", fontSize: 16, boxSizing: "border-box" },
  textarea: { width: "100%", minHeight: 190, padding: "14px 15px", border: "1px solid #475569", borderRadius: 8, background: "#0b1220", color: "#f8fafc", fontSize: 16, lineHeight: 1.55, resize: "vertical", boxSizing: "border-box" },
  primaryButton: { width: "100%", maxWidth: 340, minHeight: 52, justifySelf: "center", padding: "12px 20px", border: 0, borderRadius: 8, background: "#0e7490", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer" },
  listHeader: { display: "flex", justifyContent: "space-between", alignItems: "end", flexWrap: "wrap", gap: 18, marginBottom: 20 },
  lookupForm: { display: "flex", alignItems: "end", flexWrap: "wrap", gap: 10 },
  lookupLabel: { display: "grid", gap: 6, color: "#cbd5e1", fontSize: 12, fontWeight: 700 },
  lookupInput: { width: "min(100%, 240px)", minHeight: 44, padding: "9px 12px", border: "1px solid #475569", borderRadius: 8, background: "#0b1220", color: "#f8fafc", fontSize: 14, boxSizing: "border-box" },
  secondaryButton: { minHeight: 44, padding: "10px 18px", border: "1px solid #64748b", borderRadius: 8, background: "#1e293b", color: "#f8fafc", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  announcementList: { display: "grid", gap: 12, listStyle: "none", margin: 0, padding: 0 },
  announcement: { padding: "18px 20px", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 8, background: "rgba(2,6,23,0.35)" },
  announcementTitle: { margin: "0 0 10px", color: "#f8fafc", fontSize: 18 },
  message: { margin: 0, color: "#dbe4f0", lineHeight: 1.65, whiteSpace: "pre-wrap" },
  meta: { display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(148,163,184,0.12)", color: "#94a3b8", fontSize: 12 },
  emptyState: { margin: 0, padding: "20px 0 4px", color: "#cbd5e1" },
  error: { margin: 0, padding: "12px 16px", color: "#fecaca", background: "rgba(127,29,29,0.24)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 8 },
};

export default AnnouncementsPage;
