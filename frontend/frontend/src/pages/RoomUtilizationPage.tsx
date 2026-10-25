import { FormEvent, useEffect, useMemo, useState } from "react";
import api from "../api";

type Conference = { id: number; name: string };
type RoomSession = { session_id: number; session_title: string; room: string; room_capacity: number; expected_attendees: number; utilization_pct: number; status: string };
type UtilizationResponse = { total_sessions: number; average_utilization: number; sessions: RoomSession[] };
type Suggestion = { session_id: number; suggested_room: string; suggested_capacity: number; reason: string };

export default function RoomUtilizationPage() {
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [conferenceId, setConferenceId] = useState("");
  const [tableFilter, setTableFilter] = useState("");
  const [sortBy, setSortBy] = useState<"title" | "utilization" | "status">("title");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  const [data, setData] = useState<UtilizationResponse | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [newRoom, setNewRoom] = useState("");
  const [newCapacity, setNewCapacity] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/conferences/").then((response) => setConferences(response.data)).catch(() => setError("Unable to load conference choices."));
  }, []);

  async function loadRoomData(event?: FormEvent) {
    event?.preventDefault();
    if (!conferenceId) { setError("Choose a conference first."); return; }
    try {
      setLoading(true); setError("");
      const [utilization, suggestionResponse] = await Promise.all([
        api.get("/rooms/utilization", { params: { conference_id: Number(conferenceId) } }),
        api.get("/rooms/suggestions", { params: { conference_id: Number(conferenceId) } }),
      ]);
      setData(utilization.data);
      setSuggestions(suggestionResponse.data);
    } catch (caughtError: any) {
      setError(caughtError.response?.data?.detail || "Unable to load room data.");
      setData(null); setSuggestions([]);
    } finally { setLoading(false); }
  }

  async function updateRoom(sessionId: number, location: string, capacity: number) {
    try {
      setError("");
      await api.patch(`/sessions/${sessionId}/room`, { location, room_capacity: capacity });
      setSelectedSessionId(""); setNewRoom(""); setNewCapacity("");
      await loadRoomData();
    } catch (caughtError: any) { setError(caughtError.response?.data?.detail || "Unable to update the room."); }
  }

  function exportCsv() {
    if (!data) return;
    const lines = [
      ["Session", "Room", "Capacity", "Expected attendees", "Utilization percent", "Status"],
      ...data.sessions.map((session) => [session.session_title, session.room, session.room_capacity, session.expected_attendees, session.utilization_pct, session.status]),
    ];
    const csv = lines.map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "room-utilization.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const visibleSessions = useMemo(() => {
    if (!data) return [];

    const searchText = tableFilter.trim().toLowerCase();

    if (!searchText) {
      return data.sessions;
    }

    return data.sessions.filter((session) =>
      session.session_title.toLowerCase().includes(searchText) ||
      session.room.toLowerCase().includes(searchText) ||
      session.status.toLowerCase().includes(searchText)
    );
  }, [data, tableFilter]);

  const sortedSessions = [...visibleSessions].sort((first, second) => {
    let comparison = 0;

    if (sortBy === "title") {
      comparison = first.session_title.localeCompare(second.session_title);
    } else if (sortBy === "status") {
      comparison = first.status.localeCompare(second.status);
    } else {
      comparison = first.utilization_pct - second.utilization_pct;
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  const pageCount = Math.max(1, Math.ceil(sortedSessions.length / pageSize));

  const pageSessions = sortedSessions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [tableFilter, sortBy, sortDirection]);

  return <div className="module-page">
    <div className="page-heading"><div><p className="eyebrow">CAPACITY PLANNER</p><h1>Room utilization</h1><p className="subtitle">Review capacity, spot pressure early, and use only time-safe room suggestions.</p></div></div>
    {error && <div className="error">{error}</div>}
    <form className="inline-filter" onSubmit={loadRoomData}><label>Conference<select value={conferenceId} onChange={(event) => setConferenceId(event.target.value)} required><option value="">Choose a conference</option>{conferences.map((conference) => <option key={conference.id} value={conference.id}>{conference.name}</option>)}</select></label><button disabled={loading}>{loading ? "Loading..." : "Load room data"}</button></form>
    {data && <><section className="summary-strip"><div><span>Total sessions</span><strong>{data.total_sessions}</strong></div><div><span>Average room use</span><strong>{data.average_utilization}%</strong></div><div><span>Safe suggestions</span><strong>{suggestions.length}</strong></div></section><section className="agenda-panel"><div className="section-heading"><h2>Capacity by session</h2><input type="search" placeholder="Filter sessions, rooms or status" value={tableFilter} onChange={(event) => setTableFilter(event.target.value)} /><select value={sortBy} onChange={(event) => setSortBy(event.target.value as "title" | "utilization" | "status")}><option value="title">Sort by session</option><option value="utilization">Sort by utilization</option><option value="status">Sort by status</option></select><button type="button" className="secondary-button" onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}>{sortDirection === "asc" ? "Ascending" : "Descending"}</button><button type="button" className="secondary-button" onClick={exportCsv}>Export CSV</button></div>{sortedSessions.length ? <> <div className="table-wrap"><table><thead><tr><th>Session</th><th>Room</th><th>Capacity</th><th>Expected</th><th>Utilization</th><th>Status</th><th>Action</th></tr></thead><tbody>{pageSessions.map((session) => <tr key={session.session_id}><td>{session.session_title}</td><td>{session.room}</td><td>{session.room_capacity}</td><td>{session.expected_attendees}</td><td><div className="table-bar"><span style={{ width: `${Math.min(session.utilization_pct, 100)}%` }} /></div>{session.utilization_pct}%</td><td><span className={`status-pill ${session.status}`}>{session.status}</span></td><td><button type="button" className="secondary-button" onClick={() => setSelectedSessionId(String(session.session_id))}>Change room</button></td></tr>)}</tbody></table></div><div className="pagination-controls"><button type="button" className="secondary-button" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)}>Previous</button><span>Page {currentPage} of {pageCount}</span><button type="button" className="secondary-button" disabled={currentPage === pageCount} onClick={() => setCurrentPage((page) => page + 1)}>Next</button></div> </> : <p className="empty-state">No sessions have been scheduled yet.</p>}</section>{selectedSessionId && <section className="form-panel compact"><h2>Change room</h2><div className="inline-filter"><label>New room<input value={newRoom} onChange={(event) => setNewRoom(event.target.value)} /></label><label>New capacity<input type="number" min="2" value={newCapacity} onChange={(event) => setNewCapacity(event.target.value)} /></label><button type="button" onClick={() => updateRoom(Number(selectedSessionId), newRoom, Number(newCapacity))}>Save room</button><button type="button" className="secondary-button" onClick={() => setSelectedSessionId("")}>Cancel</button></div></section>}<section className="agenda-panel"><h2>Time-safe room suggestions</h2>{suggestions.length ? <div className="suggestion-list">{suggestions.map((suggestion) => <article className="suggestion" key={`${suggestion.session_id}-${suggestion.suggested_room}`}><p>{suggestion.reason}</p><button type="button" onClick={() => updateRoom(suggestion.session_id, suggestion.suggested_room, suggestion.suggested_capacity)}>Use {suggestion.suggested_room}</button></article>)}</div> : <p className="empty-state">No safe room moves are currently available.</p>}</section></>}</div>;
}
