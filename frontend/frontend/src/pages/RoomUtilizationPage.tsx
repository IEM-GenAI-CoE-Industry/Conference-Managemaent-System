import { useState } from "react";
import api from "../api";
import "./RoomUtilizationPage.css";

type RoomSession = {
  session_id: number;
  session_title: string;
  room: string;
  room_capacity: number;
  expected_attendees: number;
  utilization_pct: number;
  status: string;
};

type UtilizationResponse = {
  total_sessions: number;
  average_utilization: number;
  sessions: RoomSession[];
};

type Suggestion = {
  session_a_id: number;
  session_b_id: number;
  reason: string;
  suggested_swap: string;
};

function RoomUtilizationPage() {
  const [conferenceId, setConferenceId] = useState("");
  const [data, setData] = useState<UtilizationResponse | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [newRoom, setNewRoom] = useState("");
  const [newCapacity, setNewCapacity] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Load room utilization
  async function loadUtilization() {
    if (!conferenceId) {
      setError("Please enter a conference ID.");
      return;
    }

    try {
      setError("");

      const response = await api.get("/rooms/utilization", {
        params: {
          conference_id: Number(conferenceId),
        },
      });

      setData(response.data);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          "Failed to load room utilization."
      );
      setData(null);
    }
  }

  // Load room suggestions
  async function loadSuggestions() {
    if (!conferenceId) {
      setError("Please enter a conference ID.");
      return;
    }

    try {
      setError("");

      const response = await api.get("/rooms/suggestions", {
        params: {
          conference_id: Number(conferenceId),
        },
      });

      setSuggestions(response.data);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          "Failed to load room suggestions."
      );
      setSuggestions([]);
    }
  }

  // Load both utilization and suggestions
  async function loadRoomData(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);

    try {
      await Promise.all([
        loadUtilization(),
        loadSuggestions(),
      ]);
    } finally {
      setLoading(false);
    }
  }

  // Apply a room change
  async function applyRoomChange(sessionId: number) {
    if (!newRoom || !newCapacity) {
      setError("Please enter the new room and capacity.");
      return;
    }

    try {
      setError("");

      await api.patch(`/sessions/${sessionId}/room`, {
        location: newRoom,
        room_capacity: Number(newCapacity),
      });

      setNewRoom("");
      setNewCapacity("");
      setSelectedSessionId("");

      await loadUtilization();
      await loadSuggestions();
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          "Failed to update the room."
      );
    }
  }

  // Apply a suggested swap
  async function applySuggestion(suggestion: Suggestion) {
    const targetSession = data?.sessions.find(
      (session) => session.session_id === suggestion.session_b_id
    );

    if (!targetSession) {
      setError("Target session information could not be found.");
      return;
    }

    try {
      setError("");

      await api.patch(
        `/sessions/${suggestion.session_a_id}/room`,
        {
          location: targetSession.room,
          room_capacity: targetSession.room_capacity,
        }
      );

      await loadUtilization();
      await loadSuggestions();
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          "Failed to apply room suggestion."
      );
    }
  }

  return (
    <main className="room-utilization-page">
      <header className="room-utilization-header">
        <p className="room-utilization-eyebrow">Conference operations</p>
        <h1>Room Utilization</h1>
        <p>Review session capacity and find better room assignments.</p>
      </header>

      {error && (
        <p className="room-utilization-error" role="alert">
          {error}
        </p>
      )}

      <form className="room-utilization-search" onSubmit={loadRoomData}>
        <div className="room-utilization-search-copy">
          <h2>Find room data</h2>
          <p>Enter a conference ID to see room capacity and suggestions.</p>
        </div>
        <div className="room-utilization-search-controls">
          <label htmlFor="conference-id">Conference ID</label>
          <div className="room-utilization-input-row">
            <input
              id="conference-id"
              type="number"
              min="1"
              value={conferenceId}
              onChange={(e) => setConferenceId(e.target.value)}
              placeholder="Enter conference ID"
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? "Loading..." : "Load Room Data"}
            </button>
          </div>
        </div>
      </form>

      {data && (
        <section className="room-utilization-card">
          <div className="room-utilization-section-heading">
            <div>
              <p className="room-utilization-eyebrow">Capacity overview</p>
              <h2>Room Utilization</h2>
            </div>
            <div className="room-utilization-metrics">
              <span>Total sessions</span>
              <strong>{data.total_sessions}</strong>
              <span>Average utilization</span>
              <strong>{data.average_utilization}%</strong>
            </div>
          </div>

          {data.sessions.length === 0 ? (
            <p className="room-utilization-empty">No sessions found for this conference.</p>
          ) : (
            <div className="room-utilization-table-wrap">
              <table className="room-utilization-table">
                <thead>
                  <tr>
                    <th>Session</th>
                    <th>Room</th>
                    <th>Capacity</th>
                    <th>Expected Attendees</th>
                    <th>Utilization</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sessions.map((session) => (
                    <tr key={session.session_id}>
                      <td>{session.session_title}</td>
                      <td>{session.room}</td>
                      <td>{session.room_capacity}</td>
                      <td>{session.expected_attendees}</td>
                      <td>{session.utilization_pct}%</td>
                      <td><span className="room-utilization-status">{session.status}</span></td>
                      <td>
                        <button
                          className="room-utilization-secondary-button"
                          type="button"
                          onClick={() => setSelectedSessionId(String(session.session_id))}
                        >
                          Change Room
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {selectedSessionId && (
        <section className="room-utilization-card room-utilization-update">
          <h2>Update Room</h2>

          <div className="room-utilization-update-controls">
            <label>
              New room name
              <input
                type="text"
                placeholder="e.g. Main Auditorium"
                value={newRoom}
                onChange={(e) => setNewRoom(e.target.value)}
              />
            </label>
            <label>
              New capacity
              <input
                type="number"
                min="1"
                placeholder="Enter capacity"
                value={newCapacity}
                onChange={(e) => setNewCapacity(e.target.value)}
              />
            </label>
            <button
              type="button"
              onClick={() => applyRoomChange(Number(selectedSessionId))}
            >
              Apply changes
            </button>
            <button
              className="room-utilization-secondary-button"
              type="button"
              onClick={() => setSelectedSessionId("")}
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {data && (
        <section className="room-utilization-card">
          <div className="room-utilization-section-heading">
            <div>
              <p className="room-utilization-eyebrow">Smarter scheduling</p>
              <h2>Room Suggestions</h2>
            </div>
          </div>

          {suggestions.length === 0 ? (
            <p className="room-utilization-empty">No room suggestions available right now.</p>
          ) : (
            <ul className="room-utilization-suggestions">
              {suggestions.map((suggestion, index) => (
                <li key={index}>
                  <div>
                    <strong>{suggestion.reason}</strong>
                    <p>{suggestion.suggested_swap}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      applySuggestion(suggestion)
                    }
                  >
                    Apply Suggestion
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}

export default RoomUtilizationPage;