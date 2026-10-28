
import { useEffect, useState } from "react";
import api from "../api";

type Certificate = {
  id: number;
  certificate_uuid: string;
  conference_id: number;
  issued_at: string;
};

type Eligible = {
  conference_id: number;
  conference_name: string;
  user_id: number;
  attendee_name: string;
  eligible: boolean;
};

export default function CertificatesPage() {
  const organizer = localStorage.getItem("role") === "organizer";
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [eligible, setEligible] = useState<Eligible[]>([]);
  const [choice, setChoice] = useState("");
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("CERTIFICATE OF PARTICIPATION");
  const [body, setBody] = useState("This certificate is presented to");
  const [theme, setTheme] = useState("#24476B");
  const [bulkConference, setBulkConference] = useState("");

  const load = async () => {
    try {
      const [c, o] = await Promise.all([
        api.get("/certificates/me"),
        api.get("/certificates/options"),
      ]);
      setCerts(c.data);
      setEligible(o.data);

      if (o.data.length > 0) {
        setChoice((previous) =>
          previous || `${o.data[0].conference_id}:${o.data[0].user_id}`
        );
        setBulkConference((previous) => previous || String(o.data[0].conference_id));
      }
    } catch (e: any) {
      setMessage(e.response?.data?.detail || "Could not load certificates.");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const issue = async () => {
    if (!choice) return;
    const [conference_id, user_id] = choice.split(":").map(Number);

    try {
      await api.post("/certificates/generate", { conference_id, user_id });
      setMessage("Certificate issued successfully.");
      await load();
    } catch (e: any) {
      setMessage(e.response?.data?.detail || "Certificate could not be issued.");
    }
  };

  const bulkIssue = async () => {
    if (!bulkConference) return;

    try {
      const result = await api.post(
        `/certificates/bulk-generate/${Number(bulkConference)}`
      );
      setMessage(
        `Bulk generation complete. New certificates issued: ${
          result.data.new_certificates_issued
        }`
      );
      await load();
    } catch (e: any) {
      setMessage(e.response?.data?.detail || "Bulk generation failed.");
    }
  };

  const download = async (c: Certificate) => {
    try {
      const r = await api.get(`/certificates/pdf/${c.certificate_uuid}`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate-${c.certificate_uuid}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setMessage(e.response?.data?.detail || "Download failed.");
    }
  };

  const conferences = Array.from(
    new Map(eligible.map((item) => [
      item.conference_id,
      item.conference_name,
    ])).entries()
  );

  return (
    <main style={s.page}>
      <p style={s.eyebrow}>
        {organizer ? "Organizer awards" : "My achievements"}
      </p>
      <h1 style={s.title}>Certificates</h1>
      <p style={s.muted}>
        {organizer
          ? "Manage certificate designs and issue certificates to eligible attendees."
          : "Your issued certificates and downloadable PDFs."}
      </p>

      {message && <p style={s.notice}>{message}</p>}

      {organizer && (
        <>
          <section style={s.card}>
            <h2>Certificate template editor</h2>
            <label style={s.label}>
              Certificate title
              <input
                value={title}
                maxLength={100}
                onChange={(e) => setTitle(e.target.value)}
                style={s.input}
              />
            </label>

            <label style={s.label}>
              Introductory text
              <input
                value={body}
                maxLength={180}
                onChange={(e) => setBody(e.target.value)}
                style={s.input}
              />
            </label>

            <label style={s.label}>
              Theme color
              <input
                type="color"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                style={{ ...s.input, height: 48, padding: 4 }}
              />
            </label>

            <div style={{ ...s.preview, borderColor: theme }}>
              <p style={{ ...s.previewEyebrow, color: theme }}>
                CERTIFICATE PREVIEW
              </p>
              <h2 style={{ color: theme, overflowWrap: "anywhere" }}>
                {title || "Certificate title"}
              </h2>
              <p>{body || "Introductory text"}</p>
              <h3>Recipient Name</h3>
              <p>for participating in</p>
              <strong>Conference Name</strong>
              <p style={s.muted}>Preview only — no certificate issued</p>
            </div>

            <p style={s.muted}>
              This preview is local to this page. The current backend PDF
              endpoint uses a fixed design; these edits are not saved or
              applied to downloaded PDFs yet.
            </p>
          </section>

          <section style={s.card}>
            <h2>Issue an eligible certificate</h2>
            {eligible.length === 0 ? (
              <p style={s.muted}>
                No eligible attendees found from recorded session attendance.
              </p>
            ) : (
              <>
                <label style={s.label}>
                  Attendee and conference
                  <select
                    value={choice}
                    onChange={(e) => setChoice(e.target.value)}
                    style={s.input}
                  >
                    {eligible.map((x) => (
                      <option
                        key={`${x.conference_id}:${x.user_id}`}
                        value={`${x.conference_id}:${x.user_id}`}
                      >
                        {x.attendee_name} — {x.conference_name}
                      </option>
                    ))}
                  </select>
                </label>
                <button onClick={issue} style={s.button}>
                  Issue certificate
                </button>

                <label style={s.label}>
                  Bulk generation conference
                  <select
                    value={bulkConference}
                    onChange={(e) => setBulkConference(e.target.value)}
                    style={s.input}
                  >
                    {conferences.map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <button onClick={bulkIssue} style={s.button}>
                  Generate for all eligible attendees
                </button>
              </>
            )}
          </section>
        </>
      )}

      <section style={s.card}>
        <h2>My certificates</h2>
        {certs.length === 0 ? (
          <p style={s.muted}>No certificates issued yet.</p>
        ) : (
          certs.map((c) => (
            <article key={c.id} style={s.row}>
              <div>
                <strong>Conference certificate</strong>
                <div style={s.muted}>
                  Issued {c.issued_at
                    ? new Date(c.issued_at).toLocaleDateString()
                    : "date unavailable"}{" "}
                  · {c.certificate_uuid}
                </div>
              </div>
              <button onClick={() => download(c)} style={s.button}>
                Download PDF
              </button>
            </article>
          ))
        )}
      </section>

      <p style={s.muted}>
        Public verification is available using the certificate UUID.
      </p>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 900, margin: "0 auto" },
  eyebrow: {
    color: "#67e8f9",
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: ".12em",
  },
  title: { color: "#f8fafc" },
  muted: { color: "#94a3b8" },
  notice: {
    padding: 12,
    background: "#164e63",
    color: "#cffafe",
    borderRadius: 8,
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
  label: { display: "grid", gap: 8, fontWeight: 700 },
  input: {
    padding: 13,
    border: "1px solid #64748b",
    borderRadius: 8,
    background: "#111827",
    color: "white",
  },
  button: {
    width: "fit-content",
    padding: "11px 16px",
    border: 0,
    borderRadius: 8,
    background: "#2563eb",
    color: "white",
    fontWeight: 800,
    cursor: "pointer",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "center",
    padding: "14px 0",
    borderTop: "1px solid #334155",
  },
  preview: {
    background: "#fff",
    color: "#1e293b",
    border: "5px double",
    padding: 28,
    textAlign: "center",
    overflowWrap: "anywhere",
  },
  previewEyebrow: {
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: 800,
  },
};
