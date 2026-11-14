
import React, { useState, useEffect } from "react";
import api from "../api";

interface Submission {
  id: number;
  conference_id: number;
  title: string;
  abstract: string;
  keywords?: string;
  file_url?: string;
  status: string;
  camera_ready_file_url?: string;
}

interface Conference {
  id: number;
  name?: string;
  title?: string;
}

interface FormState {
  conference_id: number;
  title: string;
  abstract: string;
  keywords: string;
  file_url: string;
}

export function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);

  const [conferenceSearch, setConferenceSearch] = useState("");

  const [form, setForm] = useState<FormState>({
    conference_id: Number(localStorage.getItem("selected_conference_id") || 0),
    title: "",
    abstract: "",
    keywords: "",
    file_url: "",
  });

  const [cameraReadyUrls, setCameraReadyUrls] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  const fetchMySubmissions = async () => {
    try {
      if (!localStorage.getItem("token")) {
        setMessage("Please sign in to view your submissions.");
        return;
      }

      const response = await api.get("/submissions/me");
      setSubmissions(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMySubmissions();

    api.get("/conferences/")
      .then((response) => {
        const items: Conference[] = Array.isArray(response.data)
          ? response.data
          : [];

        setConferences(items);

        const saved = localStorage.getItem("selected_conference_id");

        const selected =
          items.find((conference) => String(conference.id) === saved) ||
          items[0];

        if (selected) {
          const name =
            selected.name || selected.title || `Conference ${selected.id}`;

          setForm((current) => ({
            ...current,
            conference_id: selected.id,
          }));

          setConferenceSearch(name);

          localStorage.setItem(
            "selected_conference_id",
            String(selected.id)
          );
        }
      })
      .catch(() =>
        setMessage("Unable to load conferences. Please refresh and try again.")
      );
  }, []);

  const handleConferenceChange = (value: string) => {
    setConferenceSearch(value);

    const selected = conferences.find((conference) => {
      const name =
        conference.name || conference.title || `Conference ${conference.id}`;

      return name.toLowerCase() === value.trim().toLowerCase();
    });

    if (selected) {
      setForm((current) => ({
        ...current,
        conference_id: selected.id,
      }));

      localStorage.setItem(
        "selected_conference_id",
        String(selected.id)
      );
    } else {
      setForm((current) => ({
        ...current,
        conference_id: 0,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !form.conference_id ||
      !conferences.some((conference) => conference.id === form.conference_id)
    ) {
      setMessage("Please select a valid conference from the suggestions.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await api.post("/submissions/", form);

      setMessage("Paper submitted successfully!");

      const selectedConferenceId = form.conference_id;

      setForm({
        conference_id: selectedConferenceId,
        title: "",
        abstract: "",
        keywords: "",
        file_url: "",
      });

      fetchMySubmissions();
    } catch (err: any) {
      setMessage(
        `Error: ${err.response?.data?.detail || err.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCameraReady = async (submissionId: number) => {
    const cameraUrl = cameraReadyUrls[submissionId];

    if (!cameraUrl) return;

    try {
      await api.post(`/submissions/${submissionId}/camera-ready`, {
        camera_ready_file_url: cameraUrl,
      });

      setMessage(`Camera-ready submitted for paper #${submissionId}!`);
      fetchMySubmissions();
    } catch (err: any) {
      setMessage(
        `Error: ${err.response?.data?.detail || err.message}`
      );
    }
  };

  const getStatusBadgeStyle = (status: string): React.CSSProperties => {
    const base: React.CSSProperties = {
      padding: "4px 10px",
      borderRadius: "9999px",
      fontSize: "0.8125rem",
      fontWeight: 600,
      display: "inline-block",
      textTransform: "capitalize",
    };

    switch (status) {
      case "accepted":
      case "final_accepted":
        return {
          ...base,
          backgroundColor: "#ECFDF5",
          color: "#047857",
          border: "1px solid #A7F3D0",
        };

      case "rejected":
        return {
          ...base,
          backgroundColor: "#FEF2F2",
          color: "#B91C1C",
          border: "1px solid #FECACA",
        };

      case "camera_ready_submitted":
        return {
          ...base,
          backgroundColor: "#F3E8FF",
          color: "#6B21A8",
          border: "1px solid #DDD6FE",
        };

      case "under_review":
        return {
          ...base,
          backgroundColor: "#FEF3C7",
          color: "#B45309",
          border: "1px solid #FDE68A",
        };

      default:
        return {
          ...base,
          backgroundColor: "#EFF6FF",
          color: "#1D4ED8",
          border: "1px solid #BFDBFE",
        };
    }
  };

  const isError =
    message.startsWith("Error") ||
    message.startsWith("Auth Error") ||
    message.startsWith("Please");

  return (
    <div
      style={{
        backgroundColor: "#F8FAFC",
        minHeight: "100vh",
        padding: "32px 24px",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header Section */}
        <div style={{ marginBottom: "28px" }}>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              color: "#0F172A",
              margin: 0,
            }}
          >
            Author Submissions
          </h1>

          <p
            style={{
              color: "#64748B",
              fontSize: "0.925rem",
              marginTop: "4px",
            }}
          >
            Submit new research papers and monitor paper status or upload
            camera-ready versions.
          </p>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            role="status"
            style={{
              padding: "12px 16px",
              backgroundColor: isError ? "#FEF2F2" : "#ECFDF5",
              border: `1px solid ${isError ? "#FECACA" : "#A7F3D0"}`,
              color: isError ? "#B91C1C" : "#047857",
              borderRadius: "8px",
              marginBottom: "24px",
              fontWeight: 500,
            }}
          >
            {message}
          </div>
        )}

        {/* Form Card */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "12px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
            padding: "24px",
            marginBottom: "32px",
          }}
        >
          <h3
            style={{
              margin: "0 0 16px 0",
              fontSize: "1.125rem",
              color: "#0F172A",
              fontWeight: 600,
            }}
          >
            Submit a New Paper
          </h3>

          <form
            onSubmit={handleSubmit}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              maxWidth: "600px",
            }}
          >
            {/* Searchable Conference Picker */}
            <div>
              <label
                htmlFor="submission-conference"
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#334155",
                  marginBottom: "6px",
                }}
              >
                Conference
              </label>

              <input
                id="submission-conference"
                type="text"
                list="submission-conferences"
                value={conferenceSearch}
                placeholder="Search conference by name"
                required
                onChange={(e) =>
                  handleConferenceChange(e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #CBD5E1",
                  fontSize: "0.875rem",
                  outline: "none",
                }}
              />

              <datalist id="submission-conferences">
                {conferences.map((conference) => (
                  <option
                    key={conference.id}
                    value={
                      conference.name ||
                      conference.title ||
                      `Conference ${conference.id}`
                    }
                  />
                ))}
              </datalist>
            </div>

            {/* Paper Title */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#334155",
                  marginBottom: "6px",
                }}
              >
                Paper Title
              </label>

              <input
                type="text"
                placeholder="Enter title..."
                value={form.title}
                onChange={(e) =>
                  setForm({ ...form, title: e.target.value })
                }
                required
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #CBD5E1",
                  fontSize: "0.875rem",
                  outline: "none",
                }}
              />
            </div>

            {/* Abstract */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#334155",
                  marginBottom: "6px",
                }}
              >
                Abstract
              </label>

              <textarea
                placeholder="Provide paper abstract..."
                value={form.abstract}
                onChange={(e) =>
                  setForm({ ...form, abstract: e.target.value })
                }
                required
                rows={4}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #CBD5E1",
                  fontSize: "0.875rem",
                  outline: "none",
                  resize: "vertical",
                }}
              />
            </div>

            {/* Keywords */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#334155",
                  marginBottom: "6px",
                }}
              >
                Keywords
              </label>

              <input
                type="text"
                placeholder="e.g. AI, Machine Learning, Deep Learning"
                value={form.keywords}
                onChange={(e) =>
                  setForm({ ...form, keywords: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #CBD5E1",
                  fontSize: "0.875rem",
                  outline: "none",
                }}
              />
            </div>

            {/* File URL */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#334155",
                  marginBottom: "6px",
                }}
              >
                PDF / File URL
              </label>

              <input
                type="text"
                placeholder="https://example.com/paper.pdf"
                value={form.file_url}
                onChange={(e) =>
                  setForm({ ...form, file_url: e.target.value })
                }
                required
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #CBD5E1",
                  fontSize: "0.875rem",
                  outline: "none",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: "#4F46E5",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "6px",
                padding: "10px 18px",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                alignSelf: "flex-start",
                marginTop: "8px",
              }}
            >
              {loading ? "Submitting..." : "Submit Paper"}
            </button>
          </form>
        </div>

        {/* Submissions List Card */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "12px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
            padding: "24px",
          }}
        >
          <h3
            style={{
              margin: "0 0 16px 0",
              fontSize: "1.125rem",
              color: "#0F172A",
              fontWeight: 600,
            }}
          >
            My Submissions
          </h3>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: "#F1F5F9",
                  borderBottom: "1px solid #E2E8F0",
                }}
              >
                <th style={tableHeaderStyle}>ID</th>
                <th style={tableHeaderStyle}>Title</th>
                <th style={tableHeaderStyle}>Status</th>
                <th style={tableHeaderStyle}>Camera-Ready Upload</th>
              </tr>
            </thead>

            <tbody>
              {submissions.length > 0 ? (
                submissions.map((sub) => (
                  <tr
                    key={sub.id}
                    style={{ borderBottom: "1px solid #E2E8F0" }}
                  >
                    <td
                      style={{
                        padding: "14px 16px",
                        color: "#0F172A",
                        fontWeight: 600,
                      }}
                    >
                      #{sub.id}
                    </td>

                    <td
                      style={{
                        padding: "14px 16px",
                        color: "#0F172A",
                        fontWeight: 500,
                      }}
                    >
                      {sub.title}
                    </td>

                    <td style={{ padding: "14px 16px" }}>
                      <span style={getStatusBadgeStyle(sub.status)}>
                        {sub.status
                          ? sub.status.replace(/_/g, " ")
                          : "Submitted"}
                      </span>
                    </td>

                    <td style={{ padding: "14px 16px" }}>
                      {sub.status === "accepted" ? (
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            alignItems: "center",
                          }}
                        >
                          <input
                            type="text"
                            placeholder="Camera-Ready PDF URL"
                            value={cameraReadyUrls[sub.id] || ""}
                            onChange={(e) =>
                              setCameraReadyUrls({
                                ...cameraReadyUrls,
                                [sub.id]: e.target.value,
                              })
                            }
                            style={{
                              padding: "6px 10px",
                              borderRadius: "6px",
                              border: "1px solid #CBD5E1",
                              fontSize: "0.8125rem",
                              outline: "none",
                            }}
                          />

                          <button
                            type="button"
                            onClick={() => handleCameraReady(sub.id)}
                            style={{
                              backgroundColor: "#4F46E5",
                              color: "#FFFFFF",
                              border: "none",
                              borderRadius: "6px",
                              padding: "6px 12px",
                              fontWeight: 600,
                              fontSize: "0.8125rem",
                              cursor: "pointer",
                            }}
                          >
                            Upload
                          </button>
                        </div>
                      ) : (
                        <span
                          style={{
                            color: "#64748B",
                            fontSize: "0.8125rem",
                          }}
                        >
                          {sub.status === "camera_ready_submitted"
                            ? "Uploaded ✓"
                            : "N/A (Requires Acceptance)"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: "32px",
                      textAlign: "center",
                      color: "#64748B",
                    }}
                  >
                    No submissions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const tableHeaderStyle: React.CSSProperties = {
  padding: "12px 16px",
  fontSize: "0.8125rem",
  fontWeight: 700,
  color: "#475569",
  textTransform: "uppercase",
};
