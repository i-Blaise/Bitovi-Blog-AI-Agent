/* global React, ReactDOM, Icon, AI_RESPONSES, INGEST_LOG, curveProgress, INGEST_DURATION_MS, SYSTEM_STATS, ChatPanel, useState, useEffect, useRef, useCallback */
// useState/useEffect/useRef/useCallback are declared in rag-chat.jsx (shared global scope).

// ── System observability panel ──────────────────────────────────────────────
function Observability() {
  return (
    <div className="border-t border-ink-700 px-5 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-bone-dim">
          <Icon name="Activity" size={12} />
          Observability
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-ok/30 bg-ok/10 px-2 py-0.5 font-mono text-[10px] text-ok">
          <span className="h-1.5 w-1.5 rounded-full bg-ok" style={{ animation: 'barPulse 1.8s ease-in-out infinite' }}></span>
          healthy
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {SYSTEM_STATS.map((s, i) => (
          <div key={i} className="rounded-lg border border-ink-700 bg-ink-800/50 px-3 py-2.5 transition-colors hover:border-ink-600">
            <div className="mb-1.5 flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-wider text-bone-dim">
              <Icon name={s.icon} size={11} className="text-brand-300" />
              {s.label}
            </div>
            <div className="truncate font-mono text-[12px] font-medium text-bone" title={s.value}>{s.value}</div>
            <div className="mt-0.5 font-mono text-[10px] text-bone-dim">{s.unit}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Ingestion panel (right) ─────────────────────────────────────────────────
function IngestionPanel({ onToast }) {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const startRef = useRef(0);
  const rafRef = useRef(null);
  const loggedRef = useRef(new Set());
  const logScrollRef = useRef(null);

  useEffect(() => {
    const el = logScrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [logs]);

  const tick = useCallback(() => {
    const elapsed = Date.now() - startRef.current;
    const frac = Math.min(elapsed / INGEST_DURATION_MS, 1);
    const pct = curveProgress(frac);
    const jitter = frac < 1 ? Math.sin(elapsed / 220) * 0.4 : 0;
    setProgress(Math.min(100, Math.max(0, pct + jitter)));

    INGEST_LOG.forEach((entry) => {
      if (pct >= entry.at && !loggedRef.current.has(entry.t)) {
        loggedRef.current.add(entry.t);
        setLogs((prev) => [...prev, entry]);
      }
    });

    if (frac >= 1) {
      setProgress(100);
      setRunning(false);
      setDone(true);
      onToast();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [onToast]);

  const start = () => {
    if (running) return;
    setRunning(true);
    setDone(false);
    setProgress(0);
    setLogs([]);
    loggedRef.current = new Set();
    startRef.current = Date.now();
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const barColor = done ? '#54b87a' : '#e63329';

  return (
    <section className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-ink-700 bg-ink-850/60 shadow-2xl shadow-black/30 backdrop-blur-sm lg:min-h-0 lg:basis-[35%]">
      <header className="border-b border-ink-700 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-600 bg-ink-800 text-brand-300">
            <Icon name="DatabaseZap" size={17} />
          </div>
          <div>
            <h2 className="font-display text-[15px] font-semibold leading-none text-bone">Blog Data Ingestion</h2>
            <p className="mt-1.5 text-[11.5px] leading-snug text-bone-dim">Crawl, chunk &amp; embed every post into the vector index.</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scroll-thin px-5 py-4">
        <button
          onClick={start}
          disabled={running}
          className="group flex w-full items-center justify-center gap-2.5 rounded-xl px-4 py-3.5 text-[14px] font-semibold text-white transition-all disabled:cursor-not-allowed"
          style={{
            background: running ? '#3a4150' : 'linear-gradient(180deg, #e63329, #cf2c23)',
            boxShadow: running ? 'none' : '0 10px 28px -12px rgba(230,51,41,0.9)',
          }}
        >
          {running ? (
            <>
              <Icon name="LoaderCircle" size={17} className="spin" />
              Ingestion running...
            </>
          ) : (
            <>
              <Icon name={done ? 'RefreshCw' : 'CloudUpload'} size={17} />
              {done ? 'Re-ingest Bitovi Blog' : 'Ingest Bitovi Blog'}
            </>
          )}
        </button>

        {(running || done) && (
          <div className="anim-fade mt-4">
            <div className="mb-2 flex items-center justify-between font-mono text-[11px]">
              <span className="text-bone-dim">{done ? 'Complete' : 'Indexing'}</span>
              <span className="font-medium" style={{ color: done ? '#9fe0b6' : '#ff8d86' }}>{Math.round(progress)}% complete</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-700">
              <div
                className={running ? 'bar-fill h-full rounded-full' : 'h-full rounded-full'}
                style={{ width: progress + '%', background: barColor, transition: 'width 0.3s ease, background 0.5s ease', animation: running ? 'barPulse 1.6s ease-in-out infinite' : 'none' }}
              ></div>
            </div>
          </div>
        )}

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-bone-dim">
              <Icon name="Terminal" size={12} />
              Live log
            </div>
            {running && (
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-brand-300">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" style={{ animation: 'barPulse 1s ease-in-out infinite' }}></span>
                streaming
              </span>
            )}
          </div>
          <div ref={logScrollRef} className="scroll-thin h-[196px] overflow-y-auto rounded-xl border border-ink-700 bg-ink-900 p-3.5 font-mono text-[12px] leading-relaxed">
            {logs.length === 0 && !running && (
              <div className="flex h-full flex-col items-center justify-center text-center text-bone-dim">
                <Icon name="Logs" size={20} className="mb-2 opacity-50" />
                <span className="text-[11.5px]">Waiting to start — log output will stream here.</span>
              </div>
            )}
            {logs.map((entry, i) => {
              const isDone = entry.at === 100;
              return (
                <div key={i} className="anim-fade flex gap-2.5 py-0.5">
                  <span className="shrink-0 text-bone-dim">[{entry.t}]</span>
                  <span className={isDone ? 'text-ok' : 'text-bone-soft'}>{isDone ? '✓ ' : ''}{entry.text}</span>
                </div>
              );
            })}
            {running && (
              <div className="flex gap-2.5 py-0.5 text-bone-dim">
                <span className="shrink-0">&gt;</span>
                <span style={{ animation: 'caret 1s step-end infinite' }}>▋</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <Observability />
    </section>
  );
}

// ── Toast ───────────────────────────────────────────────────────────────────
function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(onClose, 5000);
    return () => clearTimeout(id);
  }, [toast, onClose]);
  if (!toast) return null;
  return (
    <div className="anim-slide-right fixed right-4 top-4 z-50 w-[330px] max-w-[calc(100vw-2rem)]">
      <div className="flex items-start gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4 shadow-2xl shadow-black/60">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: 'rgba(84,184,122,0.14)', border: '1px solid rgba(84,184,122,0.4)' }}>
          <Icon name="CheckCheck" size={18} className="text-ok" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-display text-[14.5px] font-semibold text-bone">Ingestion complete</h4>
          <p className="mt-0.5 text-[12.5px] leading-snug text-bone-dim">138 articles indexed and ready to query.</p>
        </div>
        <button onClick={onClose} className="shrink-0 text-bone-dim transition-colors hover:text-bone"><Icon name="X" size={16} /></button>
      </div>
      <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-ink-700">
        <div className="h-full bg-ok" style={{ width: '100%', animation: 'shrinkBar 5s linear forwards' }}></div>
      </div>
    </div>
  );
}

// ── Root app ────────────────────────────────────────────────────────────────
function App() {
  const [messages, setMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [toast, setToast] = useState(false);
  const respIdx = useRef(0);
  const timerRef = useRef(null);

  const handleSend = useCallback((text) => {
    setMessages((prev) => [...prev, { id: Date.now() + '-u', role: 'user', text }]);
    setIsThinking(true);
    const delay = 1500 + Math.random() * 1000;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const r = AI_RESPONSES[respIdx.current % AI_RESPONSES.length];
      respIdx.current += 1;
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + '-a',
          role: 'assistant',
          text: r.answer,
          certainty: r.certainty,
          score: r.score,
          metrics: r.metrics,
          genTime: (delay / 1000).toFixed(1) + 's',
          sources: r.sources,
          retrievedChunks: r.retrievedChunks,
        },
      ]);
      setIsThinking(false);
    }, delay);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div className="mx-auto flex min-h-screen max-w-[1500px] flex-col px-4 py-4 sm:px-6 lg:h-screen lg:py-5">
      <div className="anim-fade mb-4 flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand font-display text-[20px] text-white" style={{ fontWeight: 700, boxShadow: '0 8px 24px -10px rgba(230,51,41,0.8)' }}>b</div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-[20px] font-bold leading-none text-bone">Bitovi</h1>
              <span className="rounded-md border border-ink-600 bg-ink-800 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-bone-dim">RAG Chat</span>
            </div>
            <p className="mt-1.5 hidden font-mono text-[11px] text-bone-dim sm:block">Ask the engineering blog. Get cited, confidence-scored answers.</p>
          </div>
        </div>
        <div className="hidden items-center gap-2 font-mono text-[11px] text-bone-dim md:flex">
          <Icon name="ShieldCheck" size={14} className="text-ok" />
          internal preview · v0.5
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <ChatPanel messages={messages} isThinking={isThinking} onSend={handleSend} />
        <IngestionPanel onToast={() => setToast(true)} />
      </div>

      <Toast toast={toast} onClose={() => setToast(false)} />
    </div>
  );
}

const _style = document.createElement('style');
_style.textContent = '@keyframes shrinkBar { from { width: 100%; } to { width: 0%; } }';
document.head.appendChild(_style);

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
