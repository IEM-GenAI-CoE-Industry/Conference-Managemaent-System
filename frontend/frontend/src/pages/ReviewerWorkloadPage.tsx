import { useEffect, useState } from "react";
import api from "../api";

const CONFERENCE_ID = 1;

interface Reviewer {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
}

interface Submission {
  id: number;
  conference_id: number;
  title: string;
  status: string;
}

interface WorkloadItem {
  reviewer_id: number;
  reviewer_name: string;
  assigned_count: number;
  status: string;
  expertise?: string;
}

interface Suggestion {
  reviewer_name: string;
  recommended_reviewer_id: number;
  current_load: number;
  expertise?: string;
  status?: string;
  reason?: string;
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  overloaded: { bg: "#fee2e2", color: "#dc2626" },
  moderate: { bg: "#fef3c7", color: "#d97706" },
  available: { bg: "#d1fae5", color: "#16a34a" },
};

export default function ReviewerWorkloadPage() {
  const [workload, setWorkload] = useState<WorkloadItem[]>([]);
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

  // IDs are retained internally for API requests.
  // Users select readable names instead of typing IDs.
  const [submissionId, setSubmissionId] = useState("");
  const [reviewerId, setReviewerId] = useState("");

  const [submissionSearch, setSubmissionSearch] = useState("");
  const [reviewerSearch, setReviewerSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    void loadPageData();
  }, []);

  async function loadPageData() {
    setLoading(true);
    setError("");

    try {
      const [workloadRes, reviewerRes, submissionRes] = await Promise.all([
        api.get(`/reviewers/workload?conference_id=${CONFERENCE_ID}`),
        api.get("/users/reviewers"),
        api.get("/submissions/"),
      ]);

      setWorkload(workloadRes.data.reviewers ?? []);

      const activeReviewers: Reviewer[] = Array.isArray(reviewerRes.data)
        ? reviewerRes.data.filter(
            (reviewer: Reviewer) => reviewer.is_active
          )
        : [];

      setReviewers(activeReviewers);

      const conferenceSubmissions: Submission[] = (
        Array.isArray(submissionRes.data) ? submissionRes.data : []
      ).filter(
        (submission: Submission) =>
          submission.conference_id === CONFERENCE_ID
      );

      setSubmissions(conferenceSubmissions);
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.detail ||
          "Failed to load reviewer, submission or workload data."
      );
    } finally {
      setLoading(false);
    }
  }

  function submissionLabel(submission: Submission): string {
    return `${submission.title} — ${submission.status}`;
  }

  function reviewerLabel(reviewer: Reviewer): string {
    return `${reviewer.name} — ${reviewer.email}`;
  }

  function handleSubmissionSearch(value: string) {
    setSubmissionSearch(value);

    const selected = submissions.find(
      (submission) => submissionLabel(submission) === value
    );

    setSubmissionId(selected ? String(selected.id) : "");
  }

  function handleReviewerSearch(value: string) {
    setReviewerSearch(value);

    const selected = reviewers.find(
      (reviewer) => reviewerLabel(reviewer) === value
    );

    setReviewerId(selected ? String(selected.id) : "");
  }

  async function getSuggestion() {
    setError("");
    setSuccess("");
    setSuggestion(null);

    try {
      const res = await api.get(
        `/reviewers/workload/suggest?conference_id=${CONFERENCE_ID}`
      );

      setSuggestion(res.data);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          "Failed to get reviewer suggestion."
      );
    }
  }

  async function handleReassign(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!submissionId || !reviewerId) {
      setError(
        "Please choose a submission and reviewer from the suggestions."
      );
      return;
    }

    const selectedSubmission = submissions.find(
      (submission) => submission.id === Number(submissionId)
    );

    const selectedReviewer = reviewers.find(
      (reviewer) => reviewer.id === Number(reviewerId)
    );

    if (!selectedSubmission || !selectedReviewer) {
      setError(
        "Please select a valid submission and reviewer from the list."
      );
      return;
    }

    setSubmitting(true);

    try {
      const res = await api.patch(
        `/submissions/${submissionId}/reassign?reviewer_id=${reviewerId}`
      );

      setSuccess(
        res.data?.message ||
          `"${selectedSubmission.title}" reassigned to ${selectedReviewer.name} successfully.`
      );

      setSubmissionId("");
      setReviewerId("");
      setSubmissionSearch("");
      setReviewerSearch("");
      setSuggestion(null);

      await loadPageData();
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          "Reassignment failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Reviewer Workload Balancer</h1>

      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.sectionTitle}>
            Reviewer Workload
          </h2>

          <button
            type="button"
            onClick={getSuggestion}
            style={styles.button}
            disabled={loading}
          >
            Suggest Next Reviewer
          </button>
        </div>

        {suggestion && (
          <div style={styles.suggestion}>
            <strong>
              Suggested Reviewer: {suggestion.reviewer_name}
            </strong>

            <p>
              Current workload: {suggestion.current_load} assigned paper(s)
            </p>

            <p>
              Expertise: {suggestion.expertise || "Not specified"}
            </p>

            <p>
              Workload status: {suggestion.status || "Not specified"}
            </p>

            <p>
              Why this reviewer?{" "}
              {suggestion.reason ||
                "This reviewer currently has the lowest assigned workload."}
            </p>
          </div>
        )}

        {error && (
          <div role="alert" style={styles.error}>
            {error}
          </div>
        )}

        {loading ? (
          <p style={styles.message}>
            Loading reviewer workload...
          </p>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>Reviewer Name</th>
                  <th style={styles.th}>Assigned Papers</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Expertise</th>
                </tr>
              </thead>

              <tbody>
                {workload.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={styles.emptyCell}>
                      No reviewer data yet.
                    </td>
                  </tr>
                ) : (
                  workload.map((reviewer) => {
                    const colors =
                      STATUS_COLORS[reviewer.status] ||
                      STATUS_COLORS.available;

                    return (
                      <tr
                        key={reviewer.reviewer_id}
                        style={styles.tableRow}
                      >
                        <td style={styles.td}>
                          {reviewer.reviewer_name}
                        </td>

                        <td style={styles.td}>
                          {reviewer.assigned_count}
                        </td>

                        <td style={styles.td}>
                          <span
                            style={{
                              background: colors.bg,
                              color: colors.color,
                              padding: "4px 12px",
                              borderRadius: 12,
                              fontSize: 12,
                              fontWeight: 600,
                              display: "inline-block",
                            }}
                          >
                            {reviewer.status}
                          </span>
                        </td>

                        <td style={styles.td}>
                          {reviewer.expertise || "Not specified"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>
          Reassign Submission
        </h2>

        {success && (
          <div role="status" style={styles.success}>
            {success}
          </div>
        )}

        {error && (
          <div role="alert" style={styles.error}>
            {error}
          </div>
        )}

        <form
          onSubmit={handleReassign}
          style={styles.form}
        >
          <div style={styles.field}>
            <label
              htmlFor="submissionSearch"
              style={styles.label}
            >
              Search Submission
            </label>

            <input
              id="submissionSearch"
              type="text"
              list="submission-options"
              value={submissionSearch}
              onChange={(event) =>
                handleSubmissionSearch(event.target.value)
              }
              placeholder="Type a submission title..."
              required
              autoComplete="off"
              style={styles.input}
              disabled={loading || submissions.length === 0}
            />

            <datalist id="submission-options">
              {submissions.map((submission) => (
                <option
                  key={submission.id}
                  value={submissionLabel(submission)}
                />
              ))}
            </datalist>
          </div>

          <div style={styles.field}>
            <label
              htmlFor="reviewerSearch"
              style={styles.label}
            >
              Search New Reviewer
            </label>

            <input
              id="reviewerSearch"
              type="text"
              list="reviewer-options"
              value={reviewerSearch}
              onChange={(event) =>
                handleReviewerSearch(event.target.value)
              }
              placeholder="Type a reviewer name or email..."
              required
              autoComplete="off"
              style={styles.input}
              disabled={loading || reviewers.length === 0}
            />

            <datalist id="reviewer-options">
              {reviewers.map((reviewer) => (
                <option
                  key={reviewer.id}
                  value={reviewerLabel(reviewer)}
                />
              ))}
            </datalist>
          </div>

          <button
            type="submit"
            style={styles.button}
            disabled={loading || submitting}
          >
            {submitting ? "Reassigning..." : "Reassign"}
          </button>
        </form>

        {!loading && submissions.length === 0 && (
          <p style={styles.message}>
            No submissions available for this conference.
          </p>
        )}

        {!loading && reviewers.length === 0 && (
          <p style={styles.message}>
            No active reviewers available.
          </p>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: 32,
    background: "#f9fafb",
    minHeight: "100vh",
  },

  title: {
    fontSize: 26,
    fontWeight: 700,
    color: "#111827",
    marginBottom: 24,
  },

  card: {
    background: "#fff",
    borderRadius: 10,
    padding: 24,
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    marginBottom: 24,
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: "#374151",
    margin: 0,
  },

  suggestion: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    color: "#1e3a8a",
  },

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 14,
  },

  tableHeader: {
    background: "#f3f4f6",
  },

  th: {
    padding: "10px 14px",
    textAlign: "left",
    fontSize: 13,
    color: "#374151",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },

  td: {
    padding: "12px 14px",
    color: "#374151",
    borderBottom: "1px solid #e5e7eb",
  },

  tableRow: {
    borderBottom: "1px solid #e5e7eb",
  },

  emptyCell: {
    textAlign: "center",
    padding: 20,
    color: "#6b7280",
  },

  form: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "flex-end",
    marginTop: 20,
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    minWidth: 220,
    flex: 1,
  },

  label: {
    fontSize: 14,
    fontWeight: 600,
    color: "#374151",
  },

  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    background: "#fff",
    color: "#111827",
  },

  button: {
    padding: "10px 20px",
    background: "#4f46e5",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    minHeight: 42,
  },

  error: {
    background: "#fee2e2",
    color: "#dc2626",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },

  success: {
    background: "#d1fae5",
    color: "#065f46",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },

  message: {
    textAlign: "center",
    padding: 20,
    color: "#6b7280",
  },
};