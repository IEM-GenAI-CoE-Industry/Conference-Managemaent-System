import { useState } from "react";
import api from "../api";

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
    <div>
      <h1>Room Utilization</h1>

      {error && (
        <p style={{ color: "red" }}>
          {error}
        </p>
      )}

      <form onSubmit={loadRoomData}>
        <label>Conference ID</label>
        <br />

        <input
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
      </form>

      {data && (
        <section>
          <h2>Room Utilization Table</h2>

          <p>
            <strong>Total Sessions:</strong>{" "}
            {data.total_sessions}
          </p>

          <p>
            <strong>Average Utilization:</strong>{" "}
            {data.average_utilization}%
          </p>

          {data.sessions.length === 0 ? (
            <p>No sessions found.</p>
          ) : (
            <table border={1} cellPadding={8}>
              <thead>
                <tr>
                  <th>Session</th>
                  <th>Room</th>
                  <th>Capacity</th>
                  <th>Expected Attendees</th>
                  <th>Utilization %</th>
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
                    <td>{session.status}</td>

                    <td>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedSessionId(
                            String(session.session_id)
                          )
                        }
                      >
                        Change Room
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {selectedSessionId && (
        <section>
          <h2>Update Room</h2>

          <input
            type="text"
            placeholder="New room name"
            value={newRoom}
            onChange={(e) => setNewRoom(e.target.value)}
          />

          <input
            type="number"
            min="1"
            placeholder="New capacity"
            value={newCapacity}
            onChange={(e) => setNewCapacity(e.target.value)}
          />

          <button
            type="button"
            onClick={() =>
              applyRoomChange(Number(selectedSessionId))
            }
          >
            Apply
          </button>

          <button
            type="button"
            onClick={() => setSelectedSessionId("")}
          >
            Cancel
          </button>
        </section>
      )}

      {data && (
        <section>
          <h2>Room Suggestions</h2>

          {suggestions.length === 0 ? (
            <p>No room suggestions available.</p>
          ) : (
            <ul>
              {suggestions.map((suggestion, index) => (
                <li key={index}>
                  <p>
                    <strong>Reason:</strong>{" "}
                    {suggestion.reason}
                  </p>

                  <p>
                    {suggestion.suggested_swap}
                  </p>

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
    </div>
  );
}

export default RoomUtilizationPage;