import { useEffect, useState } from "react";
import api from "../api";

export default function BottleneckPage() {
  const [alerts, setAlerts] = useState<any[]>([]); const [summary, setSummary] = useState<any>(null); const [error, setError] = useState("");
  const load = async () => { try { const [alertResponse, summaryResponse] = await Promise.all([api.get("/bottlenecks", { params: { conference_id: 1 } }), api.get("/bottlenecks/summary", { params: { conference_id: 1 } })]); setAlerts(alertResponse.data); setSummary(summaryResponse.data); } catch (exception: any) { setError(exception.response?.data?.detail || "Unable to load bottlenecks."); } };
  useEffect(() => { load(); }, []);
  return <main style={{ padding: 32 }}><h1>Bottleneck Detector</h1><button onClick={load}>Refresh</button>{error && <p>{error}</p>}{summary && <pre>{JSON.stringify(summary, null, 2)}</pre>}{alerts.length ? <ul>{alerts.map((alert, index) => <li key={index}><strong>{alert.severity}</strong>: {alert.message}</li>)}</ul> : <p>No active bottlenecks.</p>}</main>;
}
