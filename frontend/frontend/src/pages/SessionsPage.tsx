import { useEffect, useState } from "react";
import api from "../api";

type Session = {
  id: number;
  conference_id: number;
  title: string;
  speaker_id?: number | null;
  speaker_confirmed?: boolean;
  start_time: string;
  end_time: string;
  location: string;
  room_capacity: number;
  expected_attendees?: number | null;
};

type AgendaResponse = {
  conference: {
    id: number;
    name: string;
  };
  sessions: Session[];
};

function SessionsPage() {
  const [conferenceId, setConferenceId] = useState("");
  const [agenda, setAgenda] = useState<AgendaResponse | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);

  const [form, setForm] = useState({
    conference_id: "",
    title: "",
    speaker_id: "",
    start_time: "",
    end_time: "",
    location: "",
    room_capacity: "",
    expected_attendees: "",
  });

  const [assignSpeakerIds, setAssignSpeakerIds] = useState<{
    [key: number]: string;
  }>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load agenda for a conference
  async function loadAgenda(id: number) {
    try {
      setError("");

      const response = await api.get(`/conferences/${id}/agenda`);

      setAgenda(response.data);
      setSessions(response.data.sessions);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Failed to load conference agenda."
      );
      setAgenda(null);
      setSessions([]);
    }
  }

  // Create a session
  async function createSession(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      const payload = {
        conference_id: Number(form.conference_id),
        title: form.title,
        speaker_id: form.speaker_id
          ? Number(form.speaker_id)
          : null,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        location: form.location,
        room_capacity: Number(form.room_capacity),
        expected_attendees: form.expected_attendees
          ? Number(form.expected_attendees)
          : null,
      };

      await api.post("/sessions/", payload);

      const createdConferenceId = Number(form.conference_id);

      setForm({
        conference_id: "",
        title: "",
        speaker_id: "",
        start_time: "",
        end_time: "",
        location: "",
        room_capacity: "",
        expected_attendees: "",
      });

      setConferenceId(String(createdConferenceId));
      await loadAgenda(createdConferenceId);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Failed to create session."
      );
    } finally {
      setLoading(false);
    }
  }

  // Assign speaker to an existing session
  async function assignSpeaker(sessionId: number) {
    const speakerId = assignSpeakerIds[sessionId];

    if (!speakerId) {
      setError("Please enter a speaker ID.");
      return;
    }

    try {
      setError("");

      await api.post(`/sessions/${sessionId}/assign-speaker`, {
        speaker_id: Number(speakerId),
      });

      if (conferenceId) {
        await loadAgenda(Number(conferenceId));
      }
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Failed to assign speaker."
      );
    }
  }

  // Load agenda when conference ID is submitted
  function handleLoadAgenda(e: React.FormEvent) {
    e.preventDefault();

    if (!conferenceId) {
      setError("Please enter a conference ID.");
      return;
    }

    loadAgenda(Number(conferenceId));
  }

  useEffect(() => {
    if (form.conference_id) {
      setConferenceId(form.conference_id);
    }
  }, [form.conference_id]);

  return (
    <div>
      <h1>Sessions & Schedule</h1>

      {error && (
        <p style={{ color: "red" }}>
          {error}
        </p>
      )}

      <section>
        <h2>Create Session</h2>

        <form onSubmit={createSession}>
          <div>
            <label>Conference ID</label>
            <br />
            <input
              type="number"
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

          <div>
            <label>Session Title</label>
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

          <div>
            <label>Speaker ID (optional)</label>
            <br />
            <input
              type="number"
              value={form.speaker_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  speaker_id: e.target.value,
                })
              }
            />
          </div>

          <div>
            <label>Start Time</label>
            <br />
            <input
              type="datetime-local"
              value={form.start_time}
              onChange={(e) =>
                setForm({
                  ...form,
                  start_time: e.target.value,
                })
              }
              required
            />
          </div>

          <div>
            <label>End Time</label>
            <br />
            <input
              type="datetime-local"
              value={form.end_time}
              onChange={(e) =>
                setForm({
                  ...form,
                  end_time: e.target.value,
                })
              }
              required
            />
          </div>

          <div>
            <label>Room Name</label>
            <br />
            <input
              type="text"
              value={form.location}
              onChange={(e) =>
                setForm({
                  ...form,
                  location: e.target.value,
                })
              }
              required
            />
          </div>

          <div>
            <label>Room Capacity</label>
            <br />
            <input
              type="number"
              min="1"
              value={form.room_capacity}
              onChange={(e) =>
                setForm({
                  ...form,
                  room_capacity: e.target.value,
                })
              }
              required
            />
          </div>

          <div>
            <label>Expected Attendees</label>
            <br />
            <input
              type="number"
              min="0"
              value={form.expected_attendees}
              onChange={(e) =>
                setForm({
                  ...form,
                  expected_attendees: e.target.value,
                })
              }
            />
          </div>

          <br />

          <button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Session"}
          </button>
        </form>
      </section>

      <hr />

      <section>
        <h2>View Conference Agenda</h2>

        <form onSubmit={handleLoadAgenda}>
          <input
            type="number"
            placeholder="Conference ID"
            value={conferenceId}
            onChange={(e) => setConferenceId(e.target.value)}
            required
          />

          <button type="submit">
            Load Agenda
          </button>
        </form>

        {agenda && (
          <>
            <h3>{agenda.conference.name}</h3>

            {sessions.length === 0 ? (
              <p>No sessions found.</p>
            ) : (
              <ol>
                {sessions.map((session) => (
                  <li key={session.id}>
                    <strong>{session.title}</strong>

                    <p>
                      {session.start_time} → {session.end_time}
                    </p>

                    <p>
                      Room: {session.location} | Capacity:{" "}
                      {session.room_capacity}
                    </p>

                    <p>
                      Expected attendees:{" "}
                      {session.expected_attendees ?? "N/A"}
                    </p>

                    <p>
                      Speaker ID:{" "}
                      {session.speaker_id ?? "Not assigned"}
                    </p>

                    <div>
                      <input
                        type="number"
                        placeholder="Speaker ID"
                        value={assignSpeakerIds[session.id] || ""}
                        onChange={(e) =>
                          setAssignSpeakerIds({
                            ...assignSpeakerIds,
                            [session.id]: e.target.value,
                          })
                        }
                      />

                      <button
                        type="button"
                        onClick={() => assignSpeaker(session.id)}
                      >
                        Assign Speaker
                      </button>
                    </div>

                    <br />
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default SessionsPage;