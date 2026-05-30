import {
  CloudUpload,
  DatabaseZap,
  LoaderCircle,
  Logs,
  RefreshCw,
  Terminal,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getIngestStatus, startIngest } from "../../api/client";
import type { IngestStatus } from "../../types";
import { Observability } from "./Observability";

const POLL_MS = 1500;

interface LogEntry {
  t: string;
  text: string;
  done?: boolean;
}

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface Props {
  onComplete: () => void;
}

export function IngestionPanel({ onComplete }: Props) {
  const [status, setStatus] = useState<IngestStatus | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [statsKey, setStatsKey] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const completedSignaledRef = useRef(false);
  const logScrollRef = useRef<HTMLDivElement | null>(null);
  const prevStatusRef = useRef<IngestStatus["status"] | null>(null);
  const lastLoggedScrapeRef = useRef(0);
  const lastLoggedIngestRef = useRef(0);
  const pollIntervalRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const el = logScrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [logs]);

  // Poll the status endpoint — stops automatically on terminal states
  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const s = await getIngestStatus();
        if (!cancelled) {
          setStatus(s);
          if (s.status === "complete" || s.status === "error") {
            window.clearInterval(pollIntervalRef.current);
          }
        }
      } catch {
        /* backend down — silently skip */
      }
    }
    tick();
    pollIntervalRef.current = window.setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Derive log lines from status transitions
  useEffect(() => {
    if (!status) return;
    const prev = prevStatusRef.current;
    prevStatusRef.current = status.status;

    const elapsed = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
    const ts = formatTime(elapsed);

    if (prev !== "scraping" && status.status === "scraping") {
      startTimeRef.current = Date.now();
      completedSignaledRef.current = false;
      lastLoggedScrapeRef.current = 0;
      setLogs([
        { t: "00:00", text: "Fetching sitemap from bitovi.com ..." },
      ]);
      return;
    }

    if (status.status === "scraping" && status.total > 0) {
      if (lastLoggedScrapeRef.current === 0 && status.total > 0) {
        setLogs((l) => [
          ...l,
          { t: ts, text: `Discovered ${status.total} blog URLs` },
        ]);
        lastLoggedScrapeRef.current = 1;
      }
      // log every ~50 scrapes
      const tier = Math.floor(status.scraped / 50);
      if (tier > lastLoggedScrapeRef.current) {
        lastLoggedScrapeRef.current = tier;
        setLogs((l) => [
          ...l,
          { t: ts, text: `Scraped ${status.scraped} / ${status.total} articles` },
        ]);
      }
    }

    if (prev !== "ingesting" && status.status === "ingesting") {
      const fromCache = prev !== "scraping";
      const articleCount = status.ingesting_total || status.total;
      setLogs((l) => [
        ...l,
        ...(fromCache && articleCount > 0
          ? [{ t: ts, text: `Loaded ${articleCount} articles from cache (articles.json)` }]
          : []),
        { t: ts, text: "Chunking & embedding articles → text-embedding-3-small" },
        { t: ts, text: "Upserting child chunks to ChromaDB ..." },
      ]);
      lastLoggedIngestRef.current = 0;
    }

    if (status.status === "ingesting" && status.ingested > 0) {
      const tier = Math.floor(status.ingested / 50);
      if (tier > lastLoggedIngestRef.current) {
        lastLoggedIngestRef.current = tier;
        const ingestTotal = status.ingesting_total || status.total;
        setLogs((l) => [
          ...l,
          { t: ts, text: `Indexed ${status.ingested} / ${ingestTotal} articles` },
        ]);
      }
    }

    if (prev !== "complete" && status.status === "complete") {
      setLogs((l) => [
        ...l,
        { t: ts || "00:00", text: `Ingestion complete. ${status.chunks} chunks indexed.`, done: true },
      ]);
      if (!completedSignaledRef.current) {
        completedSignaledRef.current = true;
        setStatsKey((k) => k + 1);
        // Only signal toast if we kicked off this run ourselves
        if (startTimeRef.current !== null) onComplete();
      }
    }

    if (prev !== "error" && status.status === "error" && status.error) {
      setLogs((l) => [...l, { t: ts, text: `ERROR: ${status.error}` }]);
    }
  }, [status, onComplete]);

  const running =
    status?.status === "scraping" || status?.status === "ingesting";
  const done = status?.status === "complete";
  const total = status?.total || 0;
  const scraped = status?.scraped || 0;

  // Derive a continuous progress percentage. Scraping is 0-80%, ingesting is 80-100%.
  let progress = 0;
  if (status?.status === "scraping" && total > 0) {
    progress = Math.round((scraped / total) * 80);
  } else if (status?.status === "ingesting") {
    progress = 90;
  } else if (status?.status === "complete") {
    progress = 100;
  }

  const barColor = done ? "#54b87a" : "#e63329";

  async function handleStart() {
    setActionError(null);
    try {
      // Reset client-side log tracking so the next run streams fresh entries.
      startTimeRef.current = Date.now();
      completedSignaledRef.current = false;
      lastLoggedScrapeRef.current = 0;
      lastLoggedIngestRef.current = 0;
      prevStatusRef.current = null;
      setLogs([]);
      await startIngest();
      // Restart polling in case it was stopped after a previous completed run.
      window.clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = window.setInterval(async () => {
        try {
          const s = await getIngestStatus();
          setStatus(s);
          if (s.status === "complete" || s.status === "error") {
            window.clearInterval(pollIntervalRef.current);
          }
        } catch { /* skip */ }
      }, POLL_MS);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to start");
    }
  }

  return (
    <section className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-ink-700 bg-ink-850/60 shadow-2xl shadow-black/30 backdrop-blur-sm lg:min-h-0 lg:basis-[35%]">
      <header className="border-b border-ink-700 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-600 bg-ink-800 text-brand-300">
            <DatabaseZap size={17} />
          </div>
          <div>
            <h2 className="font-display text-[15px] font-semibold leading-none text-bone">
              Blog Data Ingestion
            </h2>
            <p className="mt-1.5 text-[11.5px] leading-snug text-bone-dim">
              Crawl, chunk &amp; embed every post into the vector index.
            </p>
            <p className="mt-1 text-[10.5px] leading-snug text-bone-dim/60">
              Already ingested? Re-ingestion is skipped automatically — delete <code className="text-[10px]">./chroma_db</code> and <code className="text-[10px]">./docstore</code> to force a fresh run.
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scroll-thin px-5 py-4">
        <button
          type="button"
          onClick={handleStart}
          disabled={running}
          className="group flex w-full items-center justify-center gap-2.5 rounded-xl px-4 py-3.5 text-[14px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:brightness-95 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:brightness-100"
          style={{
            background: running ? "#3a4150" : "linear-gradient(180deg, #e63329, #cf2c23)",
            boxShadow: running ? "none" : "0 10px 28px -12px rgba(230,51,41,0.9)",
          }}
        >
          {running ? (
            <>
              <LoaderCircle size={17} className="spin" />
              Ingestion running...
            </>
          ) : done ? (
            <>
              <RefreshCw size={17} className="transition-transform duration-300 group-hover:rotate-180" />
              Re-ingest Bitovi Blog
            </>
          ) : (
            <>
              <CloudUpload size={17} />
              Ingest Bitovi Blog
            </>
          )}
        </button>

        {actionError && (
          <p className="mt-3 rounded-lg bg-bad px-3 py-2 font-mono text-[11px] text-white">
            {actionError}
          </p>
        )}

        {(running || done) && (
          <div className="anim-fade mt-4">
            <div className="mb-2 flex items-center justify-between font-mono text-[11px]">
              <span className="text-bone-dim">
                {done ? "Complete" : status?.status === "scraping" ? "Scraping" : "Indexing"}
              </span>
              <span
                className="font-medium"
                style={{ color: done ? "#9fe0b6" : "#ff8d86" }}
              >
                {progress}% complete
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-700">
              <div
                className={running ? "bar-fill h-full rounded-full" : "h-full rounded-full"}
                style={{
                  width: `${progress}%`,
                  background: barColor,
                  transition: "width 0.3s ease, background 0.5s ease",
                  animation: running ? "barPulse 1.6s ease-in-out infinite" : "none",
                }}
              />
            </div>
          </div>
        )}

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-bone-dim">
              <Terminal size={12} />
              Live log
            </div>
            {running && (
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-brand-300">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-brand"
                  style={{ animation: "barPulse 1s ease-in-out infinite" }}
                />
                streaming
              </span>
            )}
          </div>
          <div
            ref={logScrollRef}
            className="scroll-thin h-[196px] overflow-y-auto rounded-xl border border-ink-700 bg-ink-900 p-3.5 font-mono text-[12px] leading-relaxed"
          >
            {logs.length === 0 && !running && (
              <div className="flex h-full flex-col items-center justify-center text-center text-bone-dim">
                <Logs size={20} className="mb-2 opacity-50" />
                <span className="text-[11.5px]">
                  Waiting to start — log output will stream here.
                </span>
              </div>
            )}
            {logs.map((entry, i) => (
              <div key={i} className="anim-fade flex gap-2.5 py-0.5">
                <span className="shrink-0 text-bone-dim">[{entry.t}]</span>
                <span className={entry.done ? "text-ok" : "text-bone-soft"}>
                  {entry.done ? "✓ " : ""}
                  {entry.text}
                </span>
              </div>
            ))}
            {running && (
              <div className="flex gap-2.5 py-0.5 text-bone-dim">
                <span className="shrink-0">&gt;</span>
                <span style={{ animation: "caret 1s step-end infinite" }}>▋</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <Observability refreshKey={statsKey} />
    </section>
  );
}
