export interface Source {
  title: string;
  url: string;
  published_date: string;
  // Optional richer fields — present if backend supplies them
  excerpt?: string;
  category?: string;
}

export interface QueryResponse {
  answer: string;
  sources: Source[];
  generation_time: string;
}

export type IngestStatusValue =
  | "idle"
  | "scraping"
  | "ingesting"
  | "complete"
  | "error";

export interface IngestStatus {
  status: IngestStatusValue;
  scraped: number;
  total: number;
  chunks: number;
  ingested: number;
  ingesting_total: number;
  error: string | null;
}

export interface SystemStats {
  indexed_articles?: number;
  last_indexed?: string;
  embedding_model?: string;
  generation_model?: string;
}

export type Role = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  genTime?: string;
  sources?: Source[];
}
