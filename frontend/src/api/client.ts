import type { IngestStatus, QueryResponse, SystemStats } from "../types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `Request failed with ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      /* not JSON */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export async function queryRag(question: string): Promise<QueryResponse> {
  const res = await fetch(`${API_URL}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  return handle<QueryResponse>(res);
}

export async function startIngest(): Promise<void> {
  const res = await fetch(`${API_URL}/ingest`, { method: "POST" });
  await handle<unknown>(res);
}

export async function getIngestStatus(): Promise<IngestStatus> {
  const res = await fetch(`${API_URL}/ingest/status`);
  return handle<IngestStatus>(res);
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`);
    if (!res.ok) return false;
    const body = (await res.json()) as { status?: string };
    return body.status === "ok";
  } catch {
    return false;
  }
}

export async function getStats(): Promise<SystemStats> {
  try {
    const res = await fetch(`${API_URL}/stats`);
    if (!res.ok) return {};
    return (await res.json()) as SystemStats;
  } catch {
    return {};
  }
}
