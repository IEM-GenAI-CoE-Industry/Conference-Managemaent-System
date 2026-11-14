
import { useEffect, useState } from "react";
import api from "../api";

type Session = {
  id: number;
  title: string;
  start_time: string;
  location?: string;
  check_in_code?: string;
};

type Attendee = {
  id: number;
  name: string;
  email: string;
  role: string;
};

type AttendanceRecord = {
  id: number;
  user_id: number;
  session_id: number;
  attended: boolean;
};

export default function AttendancePage() {
  const organizer = localStorage.getItem("role") === "organizer";

  const [sessions, setSessions] = useState<Session[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [session, setSession] = useState("");
  const [attendee, setAttendee] = useState("");
  const [code, setCode] = useState("");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const response = await api.get("/attendance/options");

        const availableSessions: Session[] = Array.isArray(response.data?.sessions)
          ? response.data.sessions
          : [];

        const availableAttendees: Attendee[] = Array.isArray(response.data?.attendees)
          ? response.data.attendees
          : [];

        setSessions(availableSessions);
        setAttendees(availableAttendees);

        if (availableSessions.length > 0) {
          setSession(String(availableSessions[0].id));
        }

        if (availableAttendees.length > 0) {
          setAttendee(String(availableAttendees[0].id));
        }
      } catch (error: any) {
        setMessage(
          error?.response?.data?.detail ||
            "Could not load attendance options."
        );
      }
    };

    loadOptions();
  }, []);

  const view = async () => {
    if (!session) {
      setMessage("Please select a session first.");
      return;
    }

    try {
      const response = await api.get<AttendanceRecord[]>("/attendance/", {
        params: { session_id: Number(session) },
      });

      setRecords(Array.isArray(response.data) ? response.data : []);
      setMessage("Attendance records loaded successfully.");
    } catch (error: any) {
      setMessage(
        error?.response?.data?.detail ||
          "Could not load attendance records."
      );
    }
  };

  const mark = async () => {
    if (!session || !attendee) {
      setMessage("Please select a session and attendee.");
      return;
    }

    setLoading(true);

    try {
      await api.post("/attendance/mark", {
        user_id: Number(attendee),
        session_id: Number(session),
        attended: true,
      });

      setMessage("Attendance recorded and saved.");
      await view();
    } catch (error: any) {
      setMessage(
        error?.response?.data?.detail ||
          "Attendance could not be recorded."
      );
    } finally {
      setLoading(false);
    }
  };

  const checkIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);

    try {
      await api.post("/attendance/check-in", { code });
      setMessage("You are checked in. Your attendance is saved.");
      setCode("");
    } catch (error: any) {
      setMessage(
        error?.response?.data?.detail || "Check-in failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={s.page}>
      <p style={s.eyebrow}>
        {organizer ? "Organizer operations" : "Attendee portal"}
      </p>

      <h1 style={s.title}>
        {organizer ? "Session check-in desk" : "My attendance"}
      </h1>

      <p style={s.muted}>
        {organizer
          ? "Select a session and registered attendee to mark attendance."
          : "Enter the check-in code provided at the session desk."}
      </p>

      {message && (
        <p role="status" style={s.notice}>
          {message}
        </p>
      )}

      <section style={s.card}>
        {organizer ? (
          <>
            <label style={s.label}>
              Session

              <select
                value={session}
                onChange={(e) => setSession(e.target.value)}
                style={s.input}
                disabled={sessions.length === 0}
              >
                <option value="">Choose a session</option>

                {sessions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title} · {new Date(item.start_time).toLocaleString()}
                  </option>
                ))}
              </select>
            </label>

            <label style={s.label}>
              Registered attendee

              <select
                value={attendee}
                onChange={(e) => setAttendee(e.target.value)}
                style={s.input}
                disabled={attendees.length === 0}
              >
                <option value="">Choose an attendee</option>

                {attendees.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.role} · {item.email}
                  </option>
                ))}
              </select>
            </label>

            {sessions.find((item) => String(item.id) === session)
              ?.check_in_code && (
              <div style={s.code}>
                Session check-in code:{" "}
                <strong>
                  {
                    sessions.find((item) => String(item.id) === session)
                      ?.check_in_code
                  }
                </strong>
              </div>
            )}

            <div style={s.actions}>
              <button
                type="button"
                onClick={mark}
                disabled={loading || !session || !attendee}
                style={s.button}
              >
                {loading ? "Saving..." : "Mark attended"}
              </button>

              <button
                type="button"
                onClick={view}
                disabled={loading || !session}
                style={s.secondary}
              >
                View attendance
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={checkIn} style={s.form}>
            <label style={s.label}>
              Session check-in code

              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="CMS-0001"
                required
                pattern="CMS-[0-9]{4}"
                style={s.input}
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              style={s.button}
            >
              {loading ? "Checking in..." : "Check in"}
            </button>
          </form>
        )}
      </section>

      {organizer && records.length > 0 && (
        <section style={s.card}>
          <h2 style={s.sectionTitle}>Attendance records</h2>

          {records.map((record) => {
            const person = attendees.find(
              (item) => item.id === record.user_id
            );

            return (
              <div key={record.id} style={s.row}>
                <span>
                  {person?.name || `User #${record.user_id}`}
                </span>

                <strong
                  style={{
                    color: record.attended ? "#86efac" : "#fca5a5",
                  }}
                >
                  {record.attended ? "Attended" : "Absent"}
                </strong>
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    width: "100%",
    maxWidth: 1000,
    margin: "0 auto",
    padding: "12px 0 40px",
  },
  eyebrow: {
    color: "#67e8f9",
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: ".12em",
  },
  title: {
    color: "#f8fafc",
    fontSize: 34,
  },
  muted: {
    color: "#cbd5e1",
  },
  notice: {
    padding: 12,
    background: "#164e63",
    borderRadius: 8,
    color: "#cffafe",
  },
  card: {
    display: "grid",
    gap: 16,
    marginTop: 20,
    padding: 24,
    border: "1px solid #334155",
    borderRadius: 14,
    background: "#0f172a",
    color: "#f8fafc",
  },
  label: {
    display: "grid",
    gap: 8,
    fontWeight: 700,
  },
  input: {
    width: "100%",
    padding: 13,
    border: "1px solid #64748b",
    borderRadius: 8,
    background: "#111827",
    color: "white",
  },
  form: {
    display: "grid",
    gap: 14,
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  button: {
    padding: "12px 18px",
    border: 0,
    borderRadius: 8,
    background: "#0e7490",
    color: "white",
    fontWeight: 800,
    cursor: "pointer",
  },
  secondary: {
    padding: "12px 18px",
    border: "1px solid #64748b",
    borderRadius: 8,
    background: "#1e293b",
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
  },
  code: {
    padding: 14,
    borderRadius: 8,
    background: "#172554",
  },
  sectionTitle: {
    color: "#f8fafc",
    margin: 0,
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "10px 0",
    borderTop: "1px solid #334155",
  },
};
