import { useState } from "react";
import api from "../api";

type Attendance = { id: number; user_id: number; session_id: number; attended: boolean };
export default function AttendancePage() {
  const [userId, setUserId] = useState(""); const [sessionId, setSessionId] = useState(""); const [records, setRecords] = useState<Attendance[]>([]); const [message, setMessage] = useState("");
  const load = async () => { try { setRecords((await api.get<Attendance[]>("/attendance/", { params: { session_id: Number(sessionId) } })).data); } catch (error: any) { setMessage(error.response?.data?.detail || "Unable to load attendance."); } };
  const mark = async (event: React.FormEvent) => { event.preventDefault(); try { await api.post("/attendance/mark", { user_id: Number(userId), session_id: Number(sessionId), attended: true }); setMessage("Attendance marked."); load(); } catch (error: any) { setMessage(error.response?.data?.detail || "Unable to mark attendance."); } };
  return <main style={{ padding: 32 }}><h1>Attendance</h1>{message && <p>{message}</p>}<form onSubmit={mark} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><input required type="number" min="1" placeholder="Participant user ID" value={userId} onChange={(e) => setUserId(e.target.value)} /><input required type="number" min="1" placeholder="Session ID" value={sessionId} onChange={(e) => setSessionId(e.target.value)} /><button>Mark Attended</button><button type="button" onClick={load} disabled={!sessionId}>View Session Attendance</button></form>{records.length > 0 && <ul>{records.map((record) => <li key={record.id}>User #{record.user_id}: {record.attended ? "attended" : "not attended"}</li>)}</ul>}</main>;
}
