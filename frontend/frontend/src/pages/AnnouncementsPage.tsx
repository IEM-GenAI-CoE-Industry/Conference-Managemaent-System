import { useEffect, useState } from "react";
import api from "../api";

type Announcement = {
  id: number;
  title: string;
  content: string;
  conference_id: number;
  created_at?: string;
};

function AnnouncementsPage() {
  const [conferenceId, setConferenceId] = useState("");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [form, setForm] = useState({
    title: "",
    content: "",
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
        content: form.content,
        conference_id: Number(form.conference_id),
      });

      const createdConferenceId = form.conference_id;

      setForm({
        title: "",
        content: "",
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
    <div>
      <h1>Announcements</h1>

      {error && (
        <p style={{ color: "red" }}>
          {error}
        </p>
      )}

      <section>
        <h2>Create Announcement</h2>

        <form onSubmit={createAnnouncement}>
          <div>
            <label>Title</label>
            <br />

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
            />
          </div>

          <br />

          <div>
            <label>Content</label>
            <br />

            <textarea
              value={form.content}
              onChange={(e) =>
                setForm({
                  ...form,
                  content: e.target.value,
                })
              }
              rows={5}
              required
            />
          </div>

          <br />

          <div>
            <label>Conference ID</label>
            <br />

            <input
              type="number"
              min="1"
              value={form.conference_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  conference_id: e.target.value,
                })
              }
              required
            />
          </div>

          <br />

          <button type="submit" disabled={loading}>
            {loading
              ? "Creating..."
              : "Create Announcement"}
          </button>
        </form>
      </section>

      <hr />

      <section>
        <h2>View Announcements</h2>

        <input
          type="number"
          min="1"
          placeholder="Conference ID"
          value={conferenceId}
          onChange={(e) =>
            setConferenceId(e.target.value)
          }
        />

        <button
          type="button"
          onClick={loadAnnouncements}
        >
          Load Announcements
        </button>

        {announcements.length === 0 ? (
          <p>No announcements found.</p>
        ) : (
          <ul>
            {announcements.map((announcement) => (
              <li key={announcement.id}>
                <h3>{announcement.title}</h3>

                <p>{announcement.content}</p>

                <p>
                  <strong>Conference ID:</strong>{" "}
                  {announcement.conference_id}
                </p>

                {announcement.created_at && (
                  <p>
                    <strong>Created:</strong>{" "}
                    {announcement.created_at}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default AnnouncementsPage;