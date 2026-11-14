
import { useEffect, useMemo, useState } from "react";
import api from "../api";

type Announcement = {
  id: number;
  title: string;
  message: string;
  conference_id: number;
  created_at?: string;
};

type Conference = {
  id: number;
  name?: string;
  title?: string;
  conference_name?: string;
};

function getConferenceName(conference: Conference): string {
  return (
    conference.name ||
    conference.title ||
    conference.conference_name ||
    `Conference ${conference.id}`
  );
}

function AnnouncementsPage() {
  const isOrganizer = localStorage.getItem("role") === "organizer";

  const [conferences, setConferences] = useState<Conference[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [createConferenceId, setCreateConferenceId] = useState("");
  const [lookupConferenceId, setLookupConferenceId] = useState("");

  const [createSearch, setCreateSearch] = useState("");
  const [lookupSearch, setLookupSearch] = useState("");

  const [form, setForm] = useState({
    title: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [loadingConferences, setLoadingConferences] = useState(true);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const createListId = "create-conference-options";
  const lookupListId = "lookup-conference-options";

  const conferenceOptions = useMemo(
    () =>
      conferences.map((conference) => ({
        id: String(conference.id),
        name: getConferenceName(conference),
      })),
    [conferences]
  );

  useEffect(() => {
    async function loadConferences() {
      try {
        setLoadingConferences(true);
        setError("");

        const response = await api.get("/conferences/");
        const data = Array.isArray(response.data)
          ? response.data
          : response.data?.items || [];

        setConferences(data);

        if (data.length > 0) {
          const firstConference = data[0];
          const firstId = String(firstConference.id);
          const firstName = getConferenceName(firstConference);

          setLookupConferenceId(firstId);
          setLookupSearch(firstName);
        }
      } catch (err: any) {
        setError(
          err.response?.data?.detail ||
            "Failed to load conferences."
        );
      } finally {
        setLoadingConferences(false);
      }
    }

    loadConferences();
  }, []);

  function handleConferenceSearch(
    value: string,
    type: "create" | "lookup"
  ) {
    const selected = conferenceOptions.find(
      (conference) => conference.name === value
    );

    if (type === "create") {
      setCreateSearch(value);
      setCreateConferenceId(selected?.id || "");
    } else {
      setLookupSearch(value);
      setLookupConferenceId(selected?.id || "");
    }
  }

  async function loadAnnouncements(
    conferenceId = lookupConferenceId
  ) {
    if (!conferenceId) {
      setError("Please select a valid conference from the suggestions.");
      return;
    }

    try {
      setLoadingAnnouncements(true);
      setError("");
      setSuccess("");

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
    } finally {
      setLoadingAnnouncements(false);
    }
  }

  async function createAnnouncement(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!createConferenceId) {
      setError("Please select a valid conference from the suggestions.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      await api.post("/announcements/", {
        title: form.title,
        message: form.message,
        conference_id: Number(createConferenceId),
      });

      const selectedId = createConferenceId;
      const selectedName = createSearch;

      setForm({
        title: "",
        message: "",
      });

      setCreateConferenceId("");
      setCreateSearch("");

      setLookupConferenceId(selectedId);
      setLookupSearch(selectedName);

      await loadAnnouncements(selectedId);

      setSuccess("Announcement created successfully.");
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          "Failed to create announcement."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.content}>
        <header style={styles.header}>
          <p style={styles.eyebrow}>Conference updates</p>
          <h1 style={styles.title}>Announcements</h1>
        </header>

        {error && (
          <p role="alert" style={styles.error}>
            {error}
          </p>
        )}

        {success && (
          <p role="status" style={styles.success}>
            {success}
          </p>
        )}

        {isOrganizer && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>
              Create Announcement
            </h2>

            <form
              onSubmit={createAnnouncement}
              style={styles.form}
            >
              <label style={styles.label}>
                Title
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      title: e.target.value,
                    })
                  }
                  required
                  style={styles.input}
                  placeholder="Announcement title"
                />
              </label>

              <label style={styles.label}>
                Content
                <textarea
                  value={form.message}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      message: e.target.value,
                    })
                  }
                  rows={6}
                  required
                  style={styles.textarea}
                  placeholder="Write the update for conference attendees"
                />
              </label>

              <label style={styles.label}>
                Search Conference
                <input
                  type="text"
                  list={createListId}
                  value={createSearch}
                  onChange={(e) =>
                    handleConferenceSearch(
                      e.target.value,
                      "create"
                    )
                  }
                  required
                  disabled={loadingConferences}
                  style={styles.input}
                  placeholder={
                    loadingConferences
                      ? "Loading conferences..."
                      : "Type conference name..."
                  }
                />

                <datalist id={createListId}>
                  {conferenceOptions.map((conference) => (
                    <option
                      key={conference.id}
                      value={conference.name}
                    />
                  ))}
                </datalist>
              </label>

              <button
                type="submit"
                disabled={
                  loading ||
                  loadingConferences ||
                  !createConferenceId
                }
                style={styles.primaryButton}
              >
                {loading ? "Creating..." : "Create Announcement"}
              </button>
            </form>
          </section>
        )}

        <section style={styles.section}>
          <div style={styles.listHeader}>
            <h2 style={styles.sectionTitle}>
              Conference Announcements
            </h2>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                loadAnnouncements();
              }}
              style={styles.lookupForm}
            >
              <label style={styles.lookupLabel}>
                Search Conference
                <input
                  type="text"
                  list={lookupListId}
                  placeholder="Type conference name..."
                  value={lookupSearch}
                  onChange={(e) =>
                    handleConferenceSearch(
                      e.target.value,
                      "lookup"
                    )
                  }
                  disabled={loadingConferences}
                  style={styles.lookupInput}
                />

                <datalist id={lookupListId}>
                  {conferenceOptions.map((conference) => (
                    <option
                      key={conference.id}
                      value={conference.name}
                    />
                  ))}
                </datalist>
              </label>

              <button
                type="submit"
                disabled={
                  loadingAnnouncements ||
                  loadingConferences ||
                  !lookupConferenceId
                }
                style={styles.secondaryButton}
              >
                {loadingAnnouncements ? "Loading..." : "Load"}
              </button>
            </form>
          </div>

          {loadingConferences ? (
            <p style={styles.emptyState}>
              Loading conferences...
            </p>
          ) : conferences.length === 0 ? (
            <p style={styles.emptyState}>
              No conferences available.
            </p>
          ) : loadingAnnouncements ? (
            <p style={styles.emptyState}>
              Loading announcements...
            </p>
          ) : announcements.length === 0 ? (
            <p style={styles.emptyState}>
              No announcements found for this conference.
            </p>
          ) : (
            <ul style={styles.announcementList}>
              {announcements.map((announcement) => (
                <li
                  key={announcement.id}
                  style={styles.announcement}
                >
                  <h3 style={styles.announcementTitle}>
                    {announcement.title}
                  </h3>

                  <p style={styles.message}>
                    {announcement.message}
                  </p>

                  <div style={styles.meta}>
                    <span>
                      Conference {announcement.conference_id}
                    </span>

                    {announcement.created_at && (
                      <time>
                        {new Date(
                          announcement.created_at
                        ).toLocaleString()}
                      </time>
                    )}
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
  page: {
    width: "100%",
    padding: "16px 12px 48px",
  },
  content: {
    width: "100%",
    maxWidth: 960,
    margin: "0 auto",
    display: "grid",
    gap: 22,
  },
  header: {
    textAlign: "center",
    marginBottom: 4,
  },
  eyebrow: {
    margin: "0 0 6px",
    color: "#67e8f9",
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
  },
  title: {
    margin: 0,
    color: "#f8fafc",
    fontSize: 34,
  },
  section: {
    width: "100%",
    padding: "26px clamp(18px, 4vw, 40px)",
    border: "1px solid rgba(148,163,184,0.2)",
    borderRadius: 12,
    background:
      "linear-gradient(145deg, rgba(15,23,42,0.96), rgba(30,41,59,0.88))",
    boxShadow: "0 16px 32px rgba(2,6,23,0.22)",
  },
  sectionTitle: {
    margin: 0,
    color: "#f8fafc",
    fontSize: 22,
  },
  form: {
    width: "100%",
    maxWidth: 760,
    margin: "22px auto 0",
    display: "grid",
    gap: 20,
  },
  label: {
    display: "grid",
    gap: 9,
    color: "#e2e8f0",
    fontSize: 15,
    fontWeight: 700,
  },
  input: {
    width: "100%",
    minHeight: 54,
    padding: "13px 15px",
    border: "1px solid #475569",
    borderRadius: 8,
    background: "#0b1220",
    color: "#f8fafc",
    fontSize: 16,
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    minHeight: 190,
    padding: "14px 15px",
    border: "1px solid #475569",
    borderRadius: 8,
    background: "#0b1220",
    color: "#f8fafc",
    fontSize: 16,
    lineHeight: 1.55,
    resize: "vertical",
    boxSizing: "border-box",
  },
  primaryButton: {
    width: "100%",
    maxWidth: 340,
    minHeight: 52,
    justifySelf: "center",
    padding: "12px 20px",
    border: 0,
    borderRadius: 8,
    background: "#0e7490",
    color: "#fff",
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
  },
  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "end",
    flexWrap: "wrap",
    gap: 18,
    marginBottom: 20,
  },
  lookupForm: {
    display: "flex",
    alignItems: "end",
    flexWrap: "wrap",
    gap: 10,
  },
  lookupLabel: {
    display: "grid",
    gap: 6,
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: 700,
  },
  lookupInput: {
    width: "min(100%, 240px)",
    minHeight: 44,
    padding: "9px 12px",
    border: "1px solid #64748b",
    borderRadius: 8,
    background: "#0b1220",
    color: "#f8fafc",
    fontSize: 14,
    boxSizing: "border-box",
  },
  secondaryButton: {
    minHeight: 44,
    padding: "10px 18px",
    border: "1px solid #64748b",
    borderRadius: 8,
    background: "#1e293b",
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  announcementList: {
    display: "grid",
    gap: 12,
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  announcement: {
    padding: "18px 20px",
    border: "1px solid rgba(148,163,184,0.15)",
    borderRadius: 8,
    background: "rgba(2,6,23,0.35)",
  },
  announcementTitle: {
    margin: "0 0 10px",
    color: "#f8fafc",
    fontSize: 18,
  },
  message: {
    margin: 0,
    color: "#dbe4f0",
    lineHeight: 1.65,
    whiteSpace: "pre-wrap",
  },
  meta: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTop: "1px solid rgba(148,163,184,0.12)",
    color: "#94a3b8",
    fontSize: 12,
  },
  emptyState: {
    margin: 0,
    padding: "20px 0 4px",
    color: "#cbd5e1",
  },
  error: {
    margin: 0,
    padding: "12px 16px",
    color: "#fecaca",
    background: "rgba(127,29,29,0.24)",
    border: "1px solid rgba(248,113,113,0.25)",
    borderRadius: 8,
  },
  success: {
    margin: 0,
    padding: "12px 16px",
    color: "#bbf7d0",
    background: "rgba(20,83,45,0.24)",
    border: "1px solid rgba(74,222,128,0.25)",
    borderRadius: 8,
  },
};

export default AnnouncementsPage;
