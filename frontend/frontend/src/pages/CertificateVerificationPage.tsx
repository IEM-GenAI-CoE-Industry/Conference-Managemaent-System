import { useState } from "react";
import api from "../api";

export default function CertificateVerificationPage() {
  const [uuid, setUuid] = useState(""); const [result, setResult] = useState<any>(null); const [error, setError] = useState("");
  const verify = async (event: React.FormEvent) => { event.preventDefault(); setResult(null); setError(""); try { setResult((await api.get(`/certificates/verify/${uuid.trim()}`)).data); } catch (exception: any) { setError(exception.response?.data?.detail || "Certificate not found."); } };
  return <main style={{ maxWidth: 620, margin: "64px auto", padding: 24 }}><h1>Certificate Verification</h1><form onSubmit={verify} style={{ display: "flex", gap: 8 }}><input required value={uuid} onChange={(e) => setUuid(e.target.value)} placeholder="Certificate UUID" style={{ flex: 1 }} /><button>Verify</button></form>{error && <p>{error}</p>}{result && <p>Valid certificate for user #{result.user_id}, conference #{result.conference_id}. Issued {new Date(result.issued_at).toLocaleString()}.</p>}</main>;
}
