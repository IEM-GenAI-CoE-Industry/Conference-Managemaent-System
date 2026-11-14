
import React, { useEffect, useRef, useState } from "react";
import api from "../api";

interface Paper {
  submission_id: number;
  status: string;
  title?: string;
  abstract?: string;
  deadline?: string | null;
}

interface SubmissionOption {
  id: number;
  title: string;
  abstract?: string;
  status: string;
}

interface Review {
  id: number;
  score: number;
  recommendation: string;
  comments: string;
}

interface ConfidentialReviewComment {
  review_id: number;
  reviewer_id: number;
  confidential_comments: string | null;
}

const tableHeaderStyle: React.CSSProperties = {
  padding: "12px 16px",
  fontSize: "0.8125rem",
  fontWeight: 700,
  color: "#475569",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
};

const tableCellStyle: React.CSSProperties = {
  padding: "14px 16px",
  color: "#0F172A",
  fontWeight: 600,
};

const formLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.875rem",
  fontWeight: 600,
  color: "#334155",
  marginBottom: "6px",
};

const formInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: "6px",
  border: "1px solid #CBD5E1",
  fontSize: "0.875rem",
  outline: "none",
  boxSizing: "border-box",
};

const buttonStyle: React.CSSProperties = {
  backgroundColor: "#4F46E5",
  color: "#FFFFFF",
  border: "none",
  borderRadius: "6px",
  padding: "9px 14px",
  fontWeight: 600,
  cursor: "pointer",
};

export function ReviewsPage() {
  const isOrganizer = localStorage.getItem("role") === "organizer";

  const [assignedPapers, setAssignedPapers] = useState<Paper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);

  const [score, setScore] = useState(5);
  const [recommendation, setRecommendation] = useState("Accept");
  const [comments, setComments] = useState("");

  const [originalityScore, setOriginalityScore] = useState(3);
  const [methodologyScore, setMethodologyScore] = useState(3);
  const [clarityScore, setClarityScore] = useState(3);
  const [significanceScore, setSignificanceScore] = useState(3);
  const [confidenceScore, setConfidenceScore] = useState(3);
  const [confidentialComments, setConfidentialComments] = useState("");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const [submissionReviews, setSubmissionReviews] = useState<Review[]>([]);
  const [confidentialReviewComments, setConfidentialReviewComments] =
    useState<ConfidentialReviewComment[]>([]);

  const [availableSubmissions, setAvailableSubmissions] = useState<SubmissionOption[]>([]);
  const [submissionSearch, setSubmissionSearch] = useState("");
  const [selectedSubmissionId, setSelectedSubmissionId] = useState("");

  const [coiSubmissionId, setCoiSubmissionId] = useState("");
  const [coiSubmissionSearch, setCoiSubmissionSearch] = useState("");
  const [coiReason, setCoiReason] = useState("");
  const [coiMessage, setCoiMessage] = useState("");

  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [loadingPapers, setLoadingPapers] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [declaringCoi, setDeclaringCoi] = useState(false);

  const [statusFilter, setStatusFilter] = useState("all");
  const [deadlineFilter, setDeadlineFilter] = useState("all");
  const [draftStatus, setDraftStatus] = useState("");

  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAvailableSubmissions = async () => {
    try {
      setLoadingSubmissions(true);
      const res = await api.get("/submissions/");
      setAvailableSubmissions(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      console.error(err);
      setMessage(err.response?.data?.detail || "Unable to load submissions.");
      setMessageType("error");
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const fetchAssignedReviews = async () => {
    setLoadingPapers(true);
    try {
      const res = await api.get("/reviews/mine");
      setAssignedPapers(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      console.error(err);
      setMessage(err.response?.data?.detail || "Unable to load assigned papers.");
      setMessageType("error");
    } finally {
      setLoadingPapers(false);
    }
  };

  useEffect(() => {
    if (isOrganizer) {
      void fetchAvailableSubmissions();
    } else {
      void fetchAssignedReviews();
    }
  }, [isOrganizer]);

  // Automatically save the review as a draft while editing.
  useEffect(() => {
    if (!selectedPaper || isOrganizer || submittingReview) return;

    if (draftTimer.current) clearTimeout(draftTimer.current);

    draftTimer.current = setTimeout(async () => {
      try {
        await api.post("/reviews/draft", {
          submission_id: selectedPaper.submission_id,
          score,
          recommendation,
          comments,
          originality_score: originalityScore,
          methodology_score: methodologyScore,
          clarity_score: clarityScore,
          significance_score: significanceScore,
          confidence_score: confidenceScore,
          confidential_comments: confidentialComments,
        });
        setDraftStatus("Draft saved");
      } catch {
        setDraftStatus("Draft not saved yet");
      }
    }, 1000);

    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
  }, [
    selectedPaper,
    isOrganizer,
    submittingReview,
    score,
    recommendation,
    comments,
    originalityScore,
    methodologyScore,
    clarityScore,
    significanceScore,
    confidenceScore,
    confidentialComments,
  ]);

  const filteredPapers = assignedPapers.filter((paper) => {
    const matchesStatus =
      statusFilter === "all" || paper.status.toLowerCase() === statusFilter;

    const deadline = paper.deadline ? new Date(paper.deadline) : null;
    const validDeadline =
      deadline !== null && !Number.isNaN(deadline.getTime());
    const overdue = validDeadline && deadline.getTime() < Date.now();

    const matchesDeadline =
      deadlineFilter === "all" ||
      (deadlineFilter === "overdue" && overdue) ||
      (deadlineFilter === "upcoming" && validDeadline && !overdue) ||
      (deadlineFilter === "unset" && !paper.deadline);

    return matchesStatus && matchesDeadline;
  });

  const resetReviewForm = () => {
    setSelectedPaper(null);
    setScore(5);
    setRecommendation("Accept");
    setComments("");
    setOriginalityScore(3);
    setMethodologyScore(3);
    setClarityScore(3);
    setSignificanceScore(3);
    setConfidenceScore(3);
    setConfidentialComments("");
    setDraftStatus("");
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPaper || submittingReview) return;

    if (
      !window.confirm(
        "Are you sure you want to submit this review? You will not be able to edit it afterward."
      )
    ) {
      return;
    }

    setSubmittingReview(true);
    setMessage("");

    try {
      await api.post("/reviews/submit", {
        submission_id: selectedPaper.submission_id,
        score,
        recommendation,
        comments,
        originality_score: originalityScore,
        methodology_score: methodologyScore,
        clarity_score: clarityScore,
        significance_score: significanceScore,
        confidence_score: confidenceScore,
        confidential_comments: confidentialComments,
      });

      setMessage("Review submitted successfully!");
      setMessageType("success");
      resetReviewForm();
      await fetchAssignedReviews();
    } catch (err: any) {
      setMessage(
        err.response?.data?.detail || err.message || "Unable to submit review."
      );
      setMessageType("error");
    } finally {
      setSubmittingReview(false);
    }
  };

  const fetchReviewsForSubmission = async () => {
    if (!selectedSubmissionId) {
      setMessage("Please select a submission first.");
      setMessageType("error");
      return;
    }

    setLoadingReviews(true);
    setMessage("");
    setSubmissionReviews([]);
    setConfidentialReviewComments([]);

    try {
      const res = await api.get(
        `/reviews/?submission_id=${selectedSubmissionId}`
      );

      const reviews = Array.isArray(res.data) ? res.data : [];
      setSubmissionReviews(reviews);

      try {
        const confidentialRes = await api.get(
          `/reviews/confidential/${selectedSubmissionId}`
        );

        setConfidentialReviewComments(
          Array.isArray(confidentialRes.data) ? confidentialRes.data : []
        );
      } catch (err) {
        console.error("Unable to load confidential review comments:", err);
      }

      if (reviews.length === 0) {
        setMessage("No reviews found for this submission.");
        setMessageType("success");
      }
    } catch (err: any) {
      console.error(err);
      setMessage(
        err.response?.data?.detail || "Unable to fetch submission reviews."
      );
      setMessageType("error");
    } finally {
      setLoadingReviews(false);
    }
  };

  const filteredSubmissions = availableSubmissions.filter((submission) => {
    const search = submissionSearch.trim().toLowerCase();

    if (!search) return true;

    return (
      String(submission.id).includes(search) ||
      submission.title.toLowerCase().includes(search) ||
      (submission.abstract || "").toLowerCase().includes(search)
    );
  });

  const handleOrganizerSubmissionChange = (value: string) => {
    setSubmissionSearch(value);

    const selected = availableSubmissions.find(
      (submission) => submission.title === value
    );

    setSelectedSubmissionId(selected ? String(selected.id) : "");
    setSubmissionReviews([]);
    setConfidentialReviewComments([]);
    setMessage("");
  };

  const handleCoiSubmissionChange = (value: string) => {
    setCoiSubmissionSearch(value);

    const selected = availableSubmissions.find(
      (submission) => submission.title === value
    );

    setCoiSubmissionId(selected ? String(selected.id) : "");
  };

  const declareConflict = async (e: React.FormEvent) => {
    e.preventDefault();

    if (declaringCoi) return;

    const submissionId = Number(coiSubmissionId);

    if (
      !Number.isInteger(submissionId) ||
      submissionId <= 0 ||
      !availableSubmissions.some((submission) => submission.id === submissionId)
    ) {
      setCoiMessage("Please select a valid submission from the suggestions.");
      return;
    }

    setDeclaringCoi(true);
    setCoiMessage("");

    try {
      const res = await api.post("/reviews/coi", {
        submission_id: submissionId,
        reason: coiReason.trim() || null,
      });

      setCoiMessage(
        res.data.message || "Conflict of interest declared successfully."
      );
      setCoiSubmissionId("");
      setCoiSubmissionSearch("");
      setCoiReason("");
    } catch (err: any) {
      setCoiMessage(
        err.response?.data?.detail || "Could not declare conflict of interest."
      );
    } finally {
      setDeclaringCoi(false);
    }
  };

  const getRecommendationBadge = (rec: string): React.CSSProperties => {
    const base: React.CSSProperties = {
      padding: "4px 10px",
      borderRadius: "9999px",
      fontSize: "0.8125rem",
      fontWeight: 600,
      display: "inline-block",
    };

    switch ((rec || "").toLowerCase()) {
      case "accept":
        return {
          ...base,
          backgroundColor: "#ECFDF5",
          color: "#047857",
          border: "1px solid #A7F3D0",
        };
      case "reject":
        return {
          ...base,
          backgroundColor: "#FEF2F2",
          color: "#B91C1C",
          border: "1px solid #FECACA",
        };
      default:
        return {
          ...base,
          backgroundColor: "#FEF3C7",
          color: "#B45309",
          border: "1px solid #FDE68A",
        };
    }
  };

  const rubricFields = [
    { label: "Originality", value: originalityScore, setValue: setOriginalityScore },
    { label: "Methodology", value: methodologyScore, setValue: setMethodologyScore },
    { label: "Clarity", value: clarityScore, setValue: setClarityScore },
    { label: "Significance", value: significanceScore, setValue: setSignificanceScore },
    { label: "Reviewer Confidence", value: confidenceScore, setValue: setConfidenceScore },
  ];

  return (
    <div
      style={{
        backgroundColor: "#F8FAFC",
        minHeight: "100vh",
        padding: "32px 24px",
        boxSizing: "border-box",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ marginBottom: "28px" }}>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              color: "#0F172A",
              margin: 0,
            }}
          >
            Reviewer &amp; Feedback Dashboard
          </h1>
          <p style={{ color: "#64748B", fontSize: "0.925rem", marginTop: "4px" }}>
            Review assigned research papers, track deadlines, and declare
            conflicts of interest.
          </p>
        </div>

        {message && (
          <div
            role={messageType === "error" ? "alert" : "status"}
            style={{
              padding: "12px 16px",
              backgroundColor: messageType === "error" ? "#FEF2F2" : "#ECFDF5",
              border: `1px solid ${
                messageType === "error" ? "#FECACA" : "#A7F3D0"
              }`,
              color: messageType === "error" ? "#B91C1C" : "#047857",
              borderRadius: "8px",
              marginBottom: "20px",
              fontWeight: 500,
            }}
          >
            {message}
          </div>
        )}

        {!isOrganizer && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: selectedPaper
                  ? "repeat(auto-fit, minmax(min(100%, 380px), 1fr))"
                  : "1fr",
                gap: "24px",
                marginBottom: "32px",
              }}
            >
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "12px",
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                  padding: "24px",
                  overflowX: "auto",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 16px",
                    fontSize: "1.125rem",
                    color: "#0F172A",
                    fontWeight: 600,
                  }}
                >
                  Assigned Papers
                </h3>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "12px",
                    marginBottom: "16px",
                  }}
                >
                  <label style={{ color: "#334155", fontSize: "0.875rem" }}>
                    Status{" "}
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      style={{ padding: "8px", borderRadius: "6px" }}
                    >
                      <option value="all">All statuses</option>
                      <option value="assigned">Assigned</option>
                      <option value="completed">Completed</option>
                    </select>
                  </label>

                  <label style={{ color: "#334155", fontSize: "0.875rem" }}>
                    Deadline{" "}
                    <select
                      value={deadlineFilter}
                      onChange={(e) => setDeadlineFilter(e.target.value)}
                      style={{ padding: "8px", borderRadius: "6px" }}
                    >
                      <option value="all">All deadlines</option>
                      <option value="upcoming">Upcoming / not overdue</option>
                      <option value="overdue">Overdue</option>
                      <option value="unset">No deadline</option>
                    </select>
                  </label>
                </div>

                {loadingPapers ? (
                  <p style={{ color: "#64748B" }}>Loading assigned papers...</p>
                ) : (
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
                        <th style={tableHeaderStyle}>Deadline</th>
                        <th style={tableHeaderStyle}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPapers.length > 0 ? (
                        filteredPapers.map((paper) => {
                          const deadline = paper.deadline
                            ? new Date(paper.deadline)
                            : null;
                          const validDeadline =
                            deadline !== null &&
                            !Number.isNaN(deadline.getTime());
                          const overdue =
                            validDeadline && deadline.getTime() < Date.now();

                          return (
                            <tr
                              key={paper.submission_id}
                              style={{ borderBottom: "1px solid #E2E8F0" }}
                            >
                              <td style={tableCellStyle}>
                                #{paper.submission_id}
                              </td>
                              <td
                                style={{
                                  ...tableCellStyle,
                                  fontWeight: 500,
                                  minWidth: "160px",
                                }}
                              >
                                {paper.title || `Submission #${paper.submission_id}`}
                              </td>
                              <td style={tableCellStyle}>
                                <span
                                  style={{
                                    ...getRecommendationBadge(""),
                                    backgroundColor:
                                      paper.status.toLowerCase() === "completed"
                                        ? "#ECFDF5"
                                        : "#EFF6FF",
                                    color:
                                      paper.status.toLowerCase() === "completed"
                                        ? "#047857"
                                        : "#1D4ED8",
                                    border:
                                      paper.status.toLowerCase() === "completed"
                                        ? "1px solid #A7F3D0"
                                        : "1px solid #BFDBFE",
                                  }}
                                >
                                  {paper.status}
                                </span>
                              </td>
                              <td style={tableCellStyle}>
                                {validDeadline ? (
                                  <span
                                    style={{
                                      color: overdue ? "#B91C1C" : "#047857",
                                      fontWeight: 600,
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {deadline.toLocaleString()}
                                    {overdue ? " — OVERDUE" : ""}
                                  </span>
                                ) : (
                                  "Not set"
                                )}
                              </td>
                              <td style={{ padding: "14px 16px" }}>
                                {paper.status.toLowerCase() === "completed" ? (
                                  <span style={{ color: "#64748B", fontSize: "0.875rem" }}>
                                    Submitted
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedPaper(paper);
                                      setMessage("");
                                      setDraftStatus("");
                                    }}
                                    style={buttonStyle}
                                  >
                                    Review
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={5}
                            style={{
                              padding: "32px",
                              textAlign: "center",
                              color: "#64748B",
                            }}
                          >
                            No papers match these filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {selectedPaper && (
                <div
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: "12px",
                    border: "1px solid #E2E8F0",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                    padding: "24px",
                    alignSelf: "start",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 8px",
                      fontSize: "1.125rem",
                      color: "#0F172A",
                      fontWeight: 600,
                    }}
                  >
                    Reviewing:{" "}
                    {selectedPaper.title ||
                      `Submission #${selectedPaper.submission_id}`}
                  </h3>

                  <p
                    role="status"
                    aria-live="polite"
                    style={{ color: "#475569", fontSize: "0.875rem" }}
                  >
                    {draftStatus}
                  </p>

                  <p
                    style={{
                      color: "#64748B",
                      fontSize: "0.875rem",
                      marginBottom: "20px",
                      lineHeight: "1.5",
                    }}
                  >
                    <strong style={{ color: "#334155" }}>Abstract:</strong>{" "}
                    {selectedPaper.abstract || "No abstract available."}
                  </p>

                  {selectedPaper.deadline && (
                    <p
                      style={{
                        color: "#B45309",
                        fontSize: "0.875rem",
                        marginBottom: "16px",
                      }}
                    >
                      <strong>Review deadline:</strong>{" "}
                      {new Date(selectedPaper.deadline).toLocaleString()}
                    </p>
                  )}

                  <form
                    onSubmit={handleReviewSubmit}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px",
                    }}
                  >
                    <div>
                      <label htmlFor="review-score" style={formLabelStyle}>
                        Score (1–10):
                      </label>
                      <input
                        id="review-score"
                        type="number"
                        min={1}
                        max={10}
                        value={score}
                        onChange={(e) => setScore(Number(e.target.value))}
                        required
                        style={formInputStyle}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="review-recommendation"
                        style={formLabelStyle}
                      >
                        Recommendation:
                      </label>
                      <select
                        id="review-recommendation"
                        value={recommendation}
                        onChange={(e) => setRecommendation(e.target.value)}
                        style={{
                          ...formInputStyle,
                          backgroundColor: "#FFFFFF",
                        }}
                      >
                        <option value="Accept">Accept</option>
                        <option value="Reject">Reject</option>
                        <option value="Revision">Revision</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="review-comments" style={formLabelStyle}>
                        Comments:
                      </label>
                      <textarea
                        id="review-comments"
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        required
                        rows={4}
                        style={{ ...formInputStyle, resize: "vertical" }}
                      />
                    </div>

                    {rubricFields.map((item) => (
                      <div key={item.label}>
                        <label
                          htmlFor={`rubric-${item.label}`}
                          style={formLabelStyle}
                        >
                          {item.label} (1–5):
                        </label>
                        <select
                          id={`rubric-${item.label}`}
                          value={item.value}
                          onChange={(e) =>
                            item.setValue(Number(e.target.value))
                          }
                          required
                          style={{
                            ...formInputStyle,
                            backgroundColor: "#FFFFFF",
                          }}
                        >
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <option key={rating} value={rating}>
                              {rating}{" "}
                              {rating === 1
                                ? "— Poor"
                                : rating === 5
                                  ? "— Excellent"
                                  : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}

                    <div>
                      <label
                        htmlFor="confidential-comments"
                        style={formLabelStyle}
                      >
                        Confidential Comments (organizers only):
                      </label>
                      <textarea
                        id="confidential-comments"
                        value={confidentialComments}
                        onChange={(e) =>
                          setConfidentialComments(e.target.value)
                        }
                        rows={3}
                        style={{ ...formInputStyle, resize: "vertical" }}
                      />
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "12px",
                        marginTop: "8px",
                      }}
                    >
                      <button
                        type="submit"
                        disabled={submittingReview}
                        style={{
                          ...buttonStyle,
                          flex: 1,
                          opacity: submittingReview ? 0.6 : 1,
                          cursor: submittingReview ? "not-allowed" : "pointer",
                        }}
                      >
                        {submittingReview ? "Submitting..." : "Submit Review"}
                      </button>
                      <button
                        type="button"
                        onClick={resetReviewForm}
                        style={{
                          backgroundColor: "#F1F5F9",
                          color: "#475569",
                          border: "1px solid #CBD5E1",
                          borderRadius: "6px",
                          padding: "10px 18px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            <div
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                padding: "24px",
                marginBottom: "32px",
              }}
            >
              <h3 style={{ marginTop: 0, color: "#0F172A" }}>
                Declare Conflict of Interest
              </h3>
              <p style={{ color: "#64748B", fontSize: "0.875rem" }}>
                Declare a conflict for a submission you have a personal,
                professional, or other relevant connection with.
              </p>

              <form
                onSubmit={declareConflict}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  maxWidth: "600px",
                }}
              >
                <div>
                  <label htmlFor="coi-submission" style={formLabelStyle}>
                    Search Submission
                  </label>
                  <input
                    id="coi-submission"
                    type="text"
                    list="coi-submissions"
                    placeholder="Search submission by title"
                    value={coiSubmissionSearch}
                    onChange={(e) => handleCoiSubmissionChange(e.target.value)}
                    required
                    style={formInputStyle}
                  />
                  <datalist id="coi-submissions">
                    {availableSubmissions.map((submission) => (
                      <option
                        key={submission.id}
                        value={submission.title}
                      />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label htmlFor="coi-reason" style={formLabelStyle}>
                    Reason (optional)
                  </label>
                  <textarea
                    id="coi-reason"
                    rows={3}
                    placeholder="Briefly explain the conflict"
                    value={coiReason}
                    onChange={(e) => setCoiReason(e.target.value)}
                    style={formInputStyle}
                  />
                </div>

                <button
                  type="submit"
                  disabled={declaringCoi}
                  style={{
                    ...buttonStyle,
                    alignSelf: "flex-start",
                    backgroundColor: "#B91C1C",
                    opacity: declaringCoi ? 0.6 : 1,
                    cursor: declaringCoi ? "not-allowed" : "pointer",
                  }}
                >
                  {declaringCoi ? "Submitting..." : "Declare Conflict"}
                </button>
              </form>

              {coiMessage && (
                <p
                  role="status"
                  style={{
                    color: coiMessage.toLowerCase().includes("could not") ||
                      coiMessage.toLowerCase().includes("valid")
                      ? "#B91C1C"
                      : "#334155",
                    marginBottom: 0,
                  }}
                >
                  {coiMessage}
                </p>
              )}
            </div>
          </>
        )}

        {isOrganizer && (
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "12px",
              border: "1px solid #E2E8F0",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
              padding: "24px",
            }}
          >
            <h2
              style={{
                margin: "0 0 16px",
                fontSize: "1.25rem",
                color: "#0F172A",
                fontWeight: 700,
              }}
            >
              Organizer View - Query Submission Reviews
            </h2>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                marginBottom: "24px",
                maxWidth: "500px",
              }}
            >
              <label
                htmlFor="submission-search"
                style={{ fontWeight: 600, color: "#334155" }}
              >
                Search submission by title or ID
              </label>
              <input
                id="submission-search"
                type="text"
                placeholder="Search submission title or ID..."
                value={submissionSearch}
                onChange={(e) => {
                  setSubmissionSearch(e.target.value);
                  setSelectedSubmissionId("");
                  setSubmissionReviews([]);
                  setConfidentialReviewComments([]);
                }}
                style={formInputStyle}
              />

              <label
                htmlFor="submission-select"
                style={{ fontWeight: 600, color: "#334155" }}
              >
                Select Submission
              </label>
              <input
                id="submission-select"
                type="text"
                list="review-submissions"
                placeholder={
                  loadingSubmissions
                    ? "Loading submissions..."
                    : "Search submission by title"
                }
                value={
                  availableSubmissions.find(
                    (submission) =>
                      String(submission.id) === selectedSubmissionId
                  )?.title || ""
                }
                onChange={(e) =>
                  handleOrganizerSubmissionChange(e.target.value)
                }
                style={{
                  ...formInputStyle,
                  backgroundColor: "#FFFFFF",
                }}
                disabled={loadingSubmissions}
              />

              <datalist id="review-submissions">
                {filteredSubmissions.map((submission) => (
                  <option
                    key={submission.id}
                    value={submission.title}
                  />
                ))}
              </datalist>

              {!loadingSubmissions && availableSubmissions.length === 0 && (
                <p style={{ color: "#64748B", margin: 0 }}>
                  No submissions found.
                </p>
              )}

              {!loadingSubmissions &&
                availableSubmissions.length > 0 &&
                filteredSubmissions.length === 0 && (
                  <p style={{ color: "#B91C1C", margin: 0 }}>
                    No matching submissions found.
                  </p>
                )}

              <button
                type="button"
                onClick={() => void fetchReviewsForSubmission()}
                disabled={!selectedSubmissionId || loadingReviews}
                style={{
                  ...buttonStyle,
                  width: "fit-content",
                  cursor:
                    selectedSubmissionId && !loadingReviews
                      ? "pointer"
                      : "not-allowed",
                  opacity: selectedSubmissionId ? 1 : 0.6,
                }}
              >
                {loadingReviews ? "Loading Reviews..." : "Fetch Reviews"}
              </button>
            </div>

            {loadingReviews && (
              <p style={{ color: "#64748B" }}>Fetching reviews...</p>
            )}

            {submissionReviews.length > 0 && (
              <div style={{ overflowX: "auto" }}>
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
                      <th style={tableHeaderStyle}>Review ID</th>
                      <th style={tableHeaderStyle}>Score</th>
                      <th style={tableHeaderStyle}>Recommendation</th>
                      <th style={tableHeaderStyle}>Comments</th>
                      <th style={tableHeaderStyle}>
                        Confidential Comments (Organizer Only)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissionReviews.map((rev) => (
                      <tr
                        key={rev.id}
                        style={{ borderBottom: "1px solid #E2E8F0" }}
                      >
                        <td style={tableCellStyle}>#{rev.id}</td>
                        <td style={tableCellStyle}>{rev.score} / 10</td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={getRecommendationBadge(rev.recommendation)}>
                            {rev.recommendation}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "14px 16px",
                            color: "#475569",
                          }}
                        >
                          {rev.comments}
                        </td>
                        <td style={tableCellStyle}>
                          {confidentialReviewComments.find(
                            (item) => item.review_id === rev.id
                          )?.confidential_comments || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loadingReviews &&
              selectedSubmissionId &&
              submissionReviews.length === 0 && (
                <p style={{ color: "#64748B" }}>
                  No reviews found for this submission, or reviews have not
                  been fetched yet.
                </p>
              )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ReviewsPage;
