import React, { useState, useEffect } from 'react';

const API = 'http://127.0.0.1:8000';

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

interface Review {
  id: number;
  score: number;
  recommendation: string;
  comments: string;
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
  const [form, setForm] = useState<FormState>({
    conference_id: 1,
    title: '',
    abstract: '',
    keywords: '',
    file_url: ''
  });
  const [cameraReadyUrls, setCameraReadyUrls] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');

  // Inline Editing States for Edit Functionality
  // const [editingSubmissionId, setEditingSubmissionId] = useState<number | null>(null);
  // const [editTitleInput, setEditTitleInput] = useState<string>('');
  const [editingSubmissionId, setEditingSubmissionId] = useState<number | null>(null);
  const [editTitleInput, setEditTitleInput] = useState<string>('');
  const [editAbstractInput, setEditAbstractInput] = useState<string>('');
  const [editKeywordsInput, setEditKeywordsInput] = useState<string>('');
  const [editFileUrlInput, setEditFileUrlInput] = useState<string>('');

  // States for H-06: Selected paper reviews view
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(false);

  const fetchMySubmissions = async () => {
    try {
      const token = localStorage.getItem('token') || '';
      if (!token) {
        setMessage('Please sign in to view your submissions.');
        return;
      }
      const res = await fetch(`${API}/submissions/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSubmissions(Array.isArray(data) ? data : []);
      } else {
        const errData = await res.json();
        setMessage(`Error: ${errData.detail || 'Not authenticated'}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMySubmissions();
  }, []);

  // Fetch feedback/reviews for a specific submission (Fix for H-06)
  const fetchSubmissionReviews = async (sub: Submission) => {
    setSelectedSubmission(sub);
    setLoadingReviews(true);
    setReviews([]);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API}/reviews/?submission_id=${sub.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReviews(Array.isArray(data) ? data : []);
      } else {
        const errData = await res.json();
        setMessage(`Error fetching feedback: ${errData.detail || 'Failed to load reviews'}`);
      }
    } catch (err: any) {
      console.error(err);
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoadingReviews(false);
    }
  };

  // Multipart PDF File Upload Handler (Support for H-05)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setMessage('Error: Only PDF documents (.pdf) are supported.');
      return;
    }

    setUploadingFile(true);
    setMessage('');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API}/submissions/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'File upload failed');

      setForm((prev) => ({ ...prev, file_url: data.file_url }));
      setMessage('PDF file uploaded successfully!');
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API}/submissions/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Submission failed');

      setMessage('Paper submitted successfully!');
      setForm({ conference_id: 1, title: '', abstract: '', keywords: '', file_url: '' });
      fetchMySubmissions();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCameraReady = async (submissionId: number) => {
    const cameraUrl = cameraReadyUrls[submissionId];
    if (!cameraUrl) return;
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API}/submissions/${submissionId}/camera-ready`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ camera_ready_file_url: cameraUrl })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');
      setMessage(`Camera-ready submitted for paper #${submissionId}!`);
      fetchMySubmissions();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const getStatusBadgeStyle = (status: string): React.CSSProperties => {
    const base: React.CSSProperties = {
      padding: '4px 10px',
      borderRadius: '9999px',
      fontSize: '0.8125rem',
      fontWeight: 600,
      display: 'inline-block',
      textTransform: 'capitalize'
    };

    switch (status) {
      case 'accepted':
      case 'final_accepted':
        return { ...base, backgroundColor: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0' };
      case 'rejected':
        return { ...base, backgroundColor: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' };
      case 'camera_ready_submitted':
        return { ...base, backgroundColor: '#F3E8FF', color: '#6B21A8', border: '1px solid #DDD6FE' };
      case 'under_review':
        return { ...base, backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A' };
      default:
        return { ...base, backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' };
    }
  };

  const getRecommendationBadge = (rec: string): React.CSSProperties => {
    const base: React.CSSProperties = {
      padding: '2px 8px',
      borderRadius: '9999px',
      fontSize: '0.75rem',
      fontWeight: 600,
      display: 'inline-block'
    };
    switch (rec.toLowerCase()) {
      case 'accept':
        return { ...base, backgroundColor: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0' };
      case 'reject':
        return { ...base, backgroundColor: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' };
      default:
        return { ...base, backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A' };
    }
  };

  const isError = message.startsWith('Error') || message.startsWith('Auth Error');

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', padding: '32px 24px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header Section */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Author Submissions
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.925rem', marginTop: '4px' }}>
            Submit new research papers and monitor paper status or upload camera-ready versions.
          </p>
        </div>

        {/* Message Banner */}
        {message && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: isError ? '#FEF2F2' : '#ECFDF5',
            border: `1px solid ${isError ? '#FECACA' : '#A7F3D0'}`,
            color: isError ? '#B91C1C' : '#047857',
            borderRadius: '8px',
            marginBottom: '24px',
            fontWeight: 500
          }}>
            {message}
          </div>
        )}

        {/* Form Card */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: '24px', marginBottom: '32px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.125rem', color: '#0F172A', fontWeight: 600 }}>
            Submit a New Paper
          </h3>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Conference ID</label>
              <input
                type="number"
                value={form.conference_id}
                onChange={(e) => setForm({ ...form, conference_id: Number(e.target.value) })}
                required
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.875rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Paper Title</label>
              <input
                type="text"
                placeholder="Enter title..."
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.875rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Abstract</label>
              <textarea
                placeholder="Provide paper abstract..."
                value={form.abstract}
                onChange={(e) => setForm({ ...form, abstract: e.target.value })}
                required
                rows={4}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.875rem', outline: 'none', resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Keywords</label>
              <input
                type="text"
                placeholder="e.g. AI, Machine Learning, Deep Learning"
                value={form.keywords}
                onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.875rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>PDF / File URL</label>
              <input
                type="text"
                placeholder="https://example.com/paper.pdf"
                value={form.file_url}
                onChange={(e) => setForm({ ...form, file_url: e.target.value })}
                required
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.875rem', outline: 'none' }}
              />
            </div>

            {/* File Upload / PDF Input Section (H-05 Support) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>PDF File / URL</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                  style={{ fontSize: '0.875rem' }}
                />
                <input
                  type="text"
                  placeholder="https://example.com/paper.pdf or /static/uploads/file.pdf"
                  value={form.file_url}
                  onChange={(e) => setForm({ ...form, file_url: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.875rem', outline: 'none' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: '#4F46E5',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 18px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                alignSelf: 'flex-start',
                marginTop: '8px'
              }}
            >
              {loading ? 'Submitting...' : 'Submit Paper'}
            </button>
          </form>
        </div>

        {/* Submissions List Card */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.125rem', color: '#0F172A', fontWeight: 600 }}>
            My Submissions
          </h3>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '12px 16px', fontSize: '0.8125rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>ID</th>
                <th style={{ padding: '12px 16px', fontSize: '0.8125rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Title</th>
                <th style={{ padding: '12px 16px', fontSize: '0.8125rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '12px 16px', fontSize: '0.8125rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Actions</th>
                <th style={{ padding: '12px 16px', fontSize: '0.8125rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Camera-Ready Upload</th>
              </tr>
            </thead>
            <tbody>
              {submissions.length > 0 ? (
                submissions.map((sub) => (
                  <tr key={sub.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '14px 16px', color: '#0F172A', fontWeight: 600 }}>#{sub.id}</td>
                    
        {/* Fully Editable Submission Cell */}
        <td style={{ padding: '14px 16px', color: '#0F172A', fontWeight: 500 }}>
          {editingSubmissionId === sub.id ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', minWidth: '280px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>Title</label>
                <input
                  type="text"
                  value={editTitleInput}
                  onChange={(e) => setEditTitleInput(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.875rem', width: '100%', outline: 'none', fontWeight: 600 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>Abstract</label>
                <textarea
                  value={editAbstractInput}
                  onChange={(e) => setEditAbstractInput(e.target.value)}
                  rows={3}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8125rem', width: '100%', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>Keywords</label>
                <input
                  type="text"
                  value={editKeywordsInput}
                  onChange={(e) => setEditKeywordsInput(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8125rem', width: '100%', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>File URL</label>
                <input
                  type="text"
                  value={editFileUrlInput}
                  onChange={(e) => setEditFileUrlInput(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8125rem', width: '100%', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  onClick={async () => {
                    if (!editTitleInput.trim() || !editAbstractInput.trim()) return;
                    try {
                      const token = localStorage.getItem('token') || '';
                      const res = await fetch(`${API}/submissions/${sub.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ 
                          title: editTitleInput.trim(), 
                          abstract: editAbstractInput.trim(),
                          keywords: editKeywordsInput.trim(),
                          file_url: editFileUrlInput.trim()
                        })
                      });
                      const data = await res.json();
                      if (res.ok) {
                        setMessage(`Paper #${sub.id} updated successfully!`);
                        setEditingSubmissionId(null);
                        fetchMySubmissions();
                      } else {
                        alert(`Update failed: ${JSON.stringify(data.detail || data)}`);
                      }
                    } catch (err: any) {
                      alert(`Error: ${err.message}`);
                    }
                  }}
                  style={{ backgroundColor: '#10B981', color: '#FFFFFF', border: 'none', borderRadius: '6px', padding: '6px 12px', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingSubmissionId(null)}
                  style={{ backgroundColor: '#64748B', color: '#FFFFFF', border: 'none', borderRadius: '6px', padding: '6px 12px', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>{sub.title}</div>
              <div style={{ fontSize: '0.8125rem', color: '#64748B', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '4px' }}>
                {sub.abstract}
              </div>
              {sub.keywords && (
                <div style={{ fontSize: '0.75rem', color: '#4F46E5', fontWeight: 500 }}>
                  Keywords: {sub.keywords}
                </div>
              )}
            </div>
          )}
        </td>

                    <td style={{ padding: '14px 16px' }}>
                      <span style={getStatusBadgeStyle(sub.status)}>
                        {sub.status ? sub.status.replace(/_/g, ' ') : 'Submitted'}
                      </span>
                    </td>

                    {/* Actions Column */}
                    <td style={{ padding: '14px 16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        onClick={() => fetchSubmissionReviews(sub)}
                        style={{ backgroundColor: '#EEF2FF', color: '#4338CA', border: '1px solid #C7D2FE', borderRadius: '6px', padding: '6px 12px', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer' }}
                      >
                        View Feedback
                      </button>

                      {sub.status === 'submitted' && editingSubmissionId !== sub.id && (
                        <button
                          onClick={() => {
                            setEditingSubmissionId(sub.id);
                            setEditTitleInput(sub.title);
                            setEditAbstractInput(sub.abstract);
                            setEditKeywordsInput(sub.keywords || '');
                            setEditFileUrlInput(sub.file_url || '');
                          
                          }}
                          style={{ backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', borderRadius: '6px', padding: '6px 12px', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer' }}
                        >
                          Edit
                        </button>
                      )}

                      {['submitted', 'under_review'].includes(sub.status) && (
                        <button
                          onClick={async () => {
                            if (!confirm(`Are you sure you want to withdraw paper #${sub.id}?`)) return;
                            const token = localStorage.getItem('token') || '';
                            const res = await fetch(`${API}/submissions/${sub.id}/withdraw`, {
                              method: 'POST',
                              headers: { Authorization: `Bearer ${token}` }
                            });
                            if (res.ok) {
                              setMessage(`Paper #${sub.id} withdrawn.`);
                              fetchMySubmissions();
                            } else {
                              const err = await res.json();
                              alert(err.detail || "Withdrawal failed");
                            }
                          }}
                          style={{ backgroundColor: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA', borderRadius: '6px', padding: '6px 12px', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer' }}
                        >
                          Withdraw
                        </button>
                      )}
                    </td>
                    
                    {/* Camera-Ready Column */}
                    <td style={{ padding: '14px 16px' }}>
                      {sub.status === 'accepted' ? (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="text"
                            placeholder="Camera-Ready PDF URL"
                            value={cameraReadyUrls[sub.id] || ''}
                            onChange={(e) => setCameraReadyUrls({ ...cameraReadyUrls, [sub.id]: e.target.value })}
                            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8125rem', outline: 'none' }}
                          />
                          <button
                            onClick={() => handleCameraReady(sub.id)}
                            style={{ backgroundColor: '#4F46E5', color: '#FFFFFF', border: '1px solid #4F46E5', borderRadius: '6px', padding: '6px 12px', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer' }}
                          >
                            Upload
                          </button>
                        </div>
                      ) : (
                        <span style={{ 
                          color: sub.status === 'final_accepted' || sub.status === 'camera_ready_submitted' ? '#16a34a' : '#64748B', 
                          fontSize: '0.8125rem', 
                          fontWeight: sub.status === 'final_accepted' || sub.status === 'camera_ready_submitted' ? 600 : 400 
                        }}>
                          {sub.status === 'final_accepted' || sub.status === 'camera_ready_submitted' ? 'Camera-ready received' : 'N/A (Requires Acceptance)'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                    No submissions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Review Feedback View Modal/Card (Fix for H-06) */}
        {selectedSubmission && (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem', color: '#0F172A', fontWeight: 600 }}>
                Reviewer Feedback for: "{selectedSubmission.title}"
              </h3>
              <button
                onClick={() => setSelectedSubmission(null)}
                style={{ backgroundColor: '#F1F5F9', color: '#64748B', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontWeight: 600 }}
              >
                Close ✕
              </button>
            </div>

            {loadingReviews ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>Loading review feedback...</div>
            ) : reviews.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {reviews.map((rev) => (
                  <div key={rev.id} style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 700, color: '#0F172A' }}>Score: {rev.score} / 10</span>
                      <span style={getRecommendationBadge(rev.recommendation)}>{rev.recommendation}</span>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                      <strong style={{ color: '#475569', display: 'block', marginBottom: '4px' }}>Reviewer Comments:</strong>
                      {rev.comments || 'No written comments provided.'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1' }}>
                No completed reviews available for this paper yet.
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}