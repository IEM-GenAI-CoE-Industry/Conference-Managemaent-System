
import { useEffect, useMemo, useState } from "react";
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

type Conference = {
  id: number;
  name: string;
};

type VerifyResult = {
  user_id: number;
  conference_id: number;
  issued_at: string;
  attendee_name?: string;
  conference_name?: string;
};

export default function CertificatesPage() {
  const organizer = localStorage.getItem("role") === "organizer";

  const [certs, setCerts] = useState<Certificate[]>([]);
  const [eligible, setEligible] = useState<Eligible[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);

  const [choice, setChoice] = useState("");
  const [attendeeSearch, setAttendeeSearch] = useState("");

  const [verifyUUID, setVerifyUUID] = useState("");
  const [verifyResult, setVerifyResult] =
    useState<VerifyResult | null>(null);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const attendeeOptions = useMemo(
    () =>
      eligible.map((item) => ({
        value: `${item.attendee_name} — ${item.conference_name}`,
        key: `${item.conference_id}:${item.user_id}`,
      })),
    [eligible]
  );

  function getConferenceName(id: number) {
    return (
      conferences.find((conference) => conference.id === id)?.name ||
      `Conference ${id}`
    );
  }

  async function load() {
    try {
      const [certificateResponse, conferenceResponse] =
        await Promise.all([
          api.get("/certificates/me"),
          api.get("/conferences/"),
        ]);

      setCerts(
        Array.isArray(certificateResponse.data)
          ? certificateResponse.data
          : []
      );

      setConferences(
        Array.isArray(conferenceResponse.data)
          ? conferenceResponse.data
          : []
      );

      if (organizer) {
        const eligibleResponse = await api.get("/certificates/options");

        const options: Eligible[] = Array.isArray(eligibleResponse.data)
          ? eligibleResponse.data
          : [];

        setEligible(options);

        setChoice((current) => {
          if (
            current &&
            options.some(
              (item) =>
                `${item.conference_id}:${item.user_id}` === current
            )
          ) {
            return current;
          }

          return options.length
            ? `${options[0].conference_id}:${options[0].user_id}`
            : "";
        });
      }
    } catch (error: any) {
      setMessage(
        error?.response?.data?.detail ||
          "Could not load certificates."
      );
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function handleAttendeeSearch(value: string) {
    setAttendeeSearch(value);

    const selected = eligible.find(
      (item) =>
        `${item.attendee_name} — ${item.conference_name}` === value
    );

    setChoice(
      selected
        ? `${selected.conference_id}:${selected.user_id}`
        : ""
    );
  }

  async function issue() {
    if (!choice) {
      setMessage("Please select an eligible attendee from the suggestions.");
      return;
    }

    const [conference_id, user_id] = choice.split(":").map(Number);

    setLoading(true);
    setMessage("");

    try {
      await api.post("/certificates/generate", {
        conference_id,
        user_id,
      });

      setMessage("Certificate issued successfully.");
      setAttendeeSearch("");
      setChoice("");

      await load();
    } catch (error: any) {
      setMessage(
        error?.response?.data?.detail ||
          "Certificate could not be issued."
      );
    } finally {
      setLoading(false);
    }
  }

  async function download(certificate: Certificate) {
    try {
      const response = await api.get(
        `/certificates/pdf/${certificate.certificate_uuid}`,
        { responseType: "blob" }
      );

      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");

      link.href = url;
      link.download = `certificate-${certificate.certificate_uuid}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch (error: any) {
      setMessage(
        error?.response?.data?.detail ||
          "Certificate download failed."
      );
    }
  }

  async function handleVerify(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setVerifyResult(null);
    setMessage("");

    try {
      const response = await api.get(
        `/certificates/verify/${verifyUUID.trim()}`
      );

      setVerifyResult(response.data);
    } catch (error: any) {
      setMessage(
        error?.response?.data?.detail ||
          "Certificate not found or invalid UUID."
      );
    }
  }

  return (
    <main style={s.page}>
      <p style={s.eyebrow}>
        {organizer ? "Organizer awards" : "My achievements"}
      </p>

      <h1 style={s.title}>Certificates</h1>

      <p style={s.muted}>
        {organizer
          ? "Issue certificates only to attendees who meet the eligibility rules."
          : "Your certificates will appear here after they are issued."}
      </p>

      {message && (
        <p role="status" style={s.notice}>
          {message}
        </p>
      )}

      {organizer && (
        <section style={s.card}>
          <h2 style={s.sectionTitle}>
            Issue an eligible certificate
          </h2>

          {eligible.length === 0 ? (
            <p style={s.muted}>
              No attendees currently meet the certificate eligibility rules.
            </p>
          ) : (
            <>
              <label style={s.label}>
                Search eligible attendee

                <input
                  type="text"
                  list="eligible-attendee-options"
                  value={attendeeSearch}
                  onChange={(event) =>
                    handleAttendeeSearch(event.target.value)
                  }
                  placeholder="Type attendee or conference name..."
                  autoComplete="off"
                  style={s.input}
                />

                <datalist id="eligible-attendee-options">
                  {attendeeOptions.map((option) => (
                    <option
                      key={option.key}
                      value={option.value}
                    />
                  ))}
                </datalist>
              </label>

              <button
                type="button"
                onClick={issue}
                disabled={loading || !choice}
                style={s.button}
              >
                {loading ? "Issuing..." : "Issue certificate"}
              </button>
            </>
          )}
        </section>
      )}

      <section style={s.card}>
        <h2 style={s.sectionTitle}>
          {organizer
            ? "Certificates issued to me"
            : "My certificates"}
        </h2>

        {certs.length === 0 ? (
          <p style={s.muted}>No certificates issued yet.</p>
        ) : (
          certs.map((certificate) => (
            <article key={certificate.id} style={s.row}>
              <div>
                <strong>Conference certificate</strong>

                <p style={s.muted}>
                  {getConferenceName(certificate.conference_id)}
                </p>

                <p style={s.muted}>
                  Issued:{" "}
                  {new Date(
                    certificate.issued_at
                  ).toLocaleDateString()}
                </p>

                <code style={s.uuid}>
                  {certificate.certificate_uuid}
                </code>
              </div>

              <button
                type="button"
                onClick={() => download(certificate)}
                style={s.button}
              >
                Download PDF
              </button>
            </article>
          ))
        )}
      </section>

      <section style={s.card}>
        <h2 style={s.sectionTitle}>
          Verify Certificate (Public)
        </h2>

        <p style={s.muted}>
          No login required. Anyone can verify a certificate using its UUID.
        </p>

        <form onSubmit={handleVerify} style={s.form}>
          <label style={s.label}>
            Certificate UUID

            <input
              value={verifyUUID}
              onChange={(event) =>
                setVerifyUUID(event.target.value)
              }
              required
              style={s.input}
              placeholder="Paste certificate UUID here..."
            />
          </label>

          <button type="submit" style={s.button}>
            Verify
          </button>
        </form>

        {verifyResult && (
          <div style={s.valid}>
            <strong>✓ Valid Certificate</strong>

            <p>
              Attendee:{" "}
              {verifyResult.attendee_name ||
                `User reference ${verifyResult.user_id}`}
            </p>

            <p>
              Conference:{" "}
              {verifyResult.conference_name ||
                getConferenceName(verifyResult.conference_id)}
            </p>

            <p>
              Issued:{" "}
              {new Date(
                verifyResult.issued_at
              ).toLocaleDateString()}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 900,
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
    fontSize: 14,
  },
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
  sectionTitle: {
    color: "#f8fafc",
    margin: 0,
  },
  label: {
    display: "grid",
    gap: 8,
    fontWeight: 700,
    color: "#e2e8f0",
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
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: 12,
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
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "center",
    padding: "14px 0",
    borderTop: "1px solid #334155",
  },
  uuid: {
    display: "inline-block",
    color: "#bae6fd",
    overflowWrap: "anywhere",
  },
  valid: {
    padding: 16,
    border: "1px solid #059669",
    borderRadius: 8,
    background: "#064e3b",
    color: "#d1fae5",
  },
};
