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
    <div>
      <h1>Conference Management</h1>

      {error && (
        <p style={{ color: "red" }}>
          {error}
        </p>
      )}

      <section>
        <h2>Create Conference</h2>

        <form onSubmit={createConference}>
          <div>
            <label>Conference Name</label>
            <br />
            <input
              type="text"
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label>Description</label>
            <br />
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>

          <div>
            <label>Start Date</label>
            <br />
            <input
              type="date"
              value={form.start_date}
              onChange={(e) =>
                setForm({ ...form, start_date: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label>End Date</label>
            <br />
            <input
              type="date"
              value={form.end_date}
              onChange={(e) =>
                setForm({ ...form, end_date: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label>Location</label>
            <br />
            <input
              type="text"
              value={form.location}
              onChange={(e) =>
                setForm({ ...form, location: e.target.value })
              }
              required
            />
          </div>

          <br />

          <button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Conference"}
          </button>
        </form>
      </section>

      <hr />

      <section>
        <h2>Conferences</h2>

        {conferences.length === 0 ? (
          <p>No conferences found.</p>
        ) : (
          <ul>
            {conferences.map((conference) => (
              <li key={conference.id}>
                <strong>{conference.name}</strong>{" "}
                ({conference.start_date} - {conference.end_date}){" "}
                <button onClick={() => viewConference(conference.id)}>
                  View Details
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selectedConference && (
        <>
          <hr />

          <section>
            <h2>Conference Details</h2>

            <p>
              <strong>Name:</strong> {selectedConference.name}
            </p>

            <p>
              <strong>Description:</strong>{" "}
              {selectedConference.description || "N/A"}
            </p>

            <p>
              <strong>Start Date:</strong>{" "}
              {selectedConference.start_date || "N/A"}
            </p>

            <p>
              <strong>End Date:</strong>{" "}
              {selectedConference.end_date || "N/A"}
            </p>

            <p>
              <strong>Location:</strong>{" "}
              {selectedConference.location || "N/A"}
            </p>

            <p>
              <strong>Organizer ID:</strong>{" "}
              {selectedConference.organizer_id ?? "N/A"}
            </p>
          </section>
        </>
      )}
    </div>
  );
}

export default ConferencesPage;