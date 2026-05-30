/* global React, ReactDOM, Icon, renderMarkdown, AI_RESPONSES, CERTAINTY_STYLES, INGEST_LOG, SYSTEM_STATS */

// ── Static print versions of the live components (no animation / no scroll) ──
function PrintBadge({ certainty, score }) {
  const s = CERTAINTY_STYLES[certainty];
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full pl-2 pr-3 py-1 text-[12px] font-mono font-medium tracking-wide"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text }}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: s.dot }}></span>
      <span>{certainty}</span>
      <span className="opacity-50">·</span>
      <span>{score}% confidence</span>
    </span>
  );
}

function PrintSource({ source, index }) {
  return (
    <div
      className="avoid-break block rounded-r-lg border-y border-r border-ink-600 bg-ink-800/70 py-3 pl-4 pr-3.5"
      style={{ borderLeft: '3px solid #e63329' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="font-mono text-[10px] uppercase tracking-widest text-brand-300">
            Source {String(index + 1).padStart(2, '0')}
          </span>
          <h4 className="mt-1 font-display text-[15px] font-semibold leading-snug text-bone">{source.title}</h4>
          <p className="mt-1 text-[12.5px] leading-relaxed text-bone-dim">{source.excerpt}</p>
          <div className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-bone-dim">
            <Icon name="Link" size={11} />
            <span>bitovi.com/blog/{source.slug}</span>
          </div>
        </div>
        <Icon name="ArrowUpRight" size={16} className="mt-0.5 shrink-0 text-bone-dim" />
      </div>
    </div>
  );
}

function PrintMessage({ msg }) {
  if (msg.role === 'user') {
    return (
      <div className="avoid-break flex justify-end">
        <div className="flex max-w-[80%] items-start gap-3">
          <div
            className="rounded-2xl rounded-tr-sm px-4 py-2.5 text-[14.5px] leading-relaxed text-white"
            style={{ background: 'linear-gradient(180deg, #e63329, #cf2c23)' }}
          >
            {msg.text}
          </div>
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-700 text-bone-soft">
            <Icon name="User" size={15} />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="avoid-break flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink-600 bg-ink-800">
        <Icon name="Bot" size={16} className="text-brand-300" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl rounded-tl-sm border border-ink-600 bg-ink-800/80 px-4 py-3.5">
          <div className="md text-[14.5px] leading-relaxed text-bone-soft">{renderMarkdown(msg.text)}</div>
          <div className="mt-3.5 border-t border-ink-700 pt-3">
            <PrintBadge certainty={msg.certainty} score={msg.score} />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-bone-dim">
            <Icon name="BookOpen" size={12} />
            Grounded in {msg.sources.length} source{msg.sources.length > 1 ? 's' : ''}
          </div>
          <div className="flex flex-col gap-2">
            {msg.sources.map((src, i) => (
              <PrintSource key={i} source={src} index={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Build a seeded transcript from the canned responses.
const SEED_QUESTIONS = [
  'How does Bitovi recommend structuring React components?',
  'Can change propagation beat virtual DOM diffing?',
  'What changed in CanJS 6.0?',
];
const TRANSCRIPT = [];
SEED_QUESTIONS.forEach((q, i) => {
  const r = AI_RESPONSES[i % AI_RESPONSES.length];
  TRANSCRIPT.push({ id: 'u' + i, role: 'user', text: q });
  TRANSCRIPT.push({
    id: 'a' + i,
    role: 'assistant',
    text: r.answer,
    certainty: r.certainty,
    score: r.score,
    sources: r.sources,
  });
});

function Panel({ children, className = '' }) {
  return <section className={'rounded-2xl border border-ink-700 bg-ink-850/60 ' + className}>{children}</section>;
}

function PrintApp() {
  return (
    <div className="mx-auto max-w-[820px] px-6 py-7">
      {/* brand header */}
      <div className="mb-5 flex items-center justify-between border-b border-ink-700 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand font-display text-[20px] text-white" style={{ fontWeight: 700 }}>b</div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-[20px] font-bold leading-none text-bone">Bitovi</h1>
              <span className="rounded-md border border-ink-600 bg-ink-800 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-bone-dim">RAG Chat</span>
            </div>
            <p className="mt-1.5 font-mono text-[11px] text-bone-dim">Cited, confidence-scored answers from the engineering blog.</p>
          </div>
        </div>
        <div className="text-right font-mono text-[10px] uppercase tracking-widest text-bone-dim">
          Session transcript<br />May 29, 2026
        </div>
      </div>

      {/* chat transcript */}
      <Panel className="mb-5 p-5">
        <div className="mb-4 flex items-center gap-3 border-b border-ink-700 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white"><Icon name="MessagesSquare" size={18} /></div>
          <div>
            <h2 className="font-display text-[17px] font-semibold leading-none text-bone">Blog Knowledge Assistant</h2>
            <p className="mt-1 font-mono text-[11px] text-bone-dim">Retrieval-augmented · grounded in bitovi.com/blog</p>
          </div>
        </div>
        <div className="flex flex-col gap-6">
          {TRANSCRIPT.map((m) => (
            <PrintMessage key={m.id} msg={m} />
          ))}
        </div>
      </Panel>

      {/* ingestion panel — completed state */}
      <Panel className="avoid-break page-break mt-6 p-5">
        <div className="mb-4 flex items-center gap-2.5 border-b border-ink-700 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-600 bg-ink-800 text-brand-300"><Icon name="DatabaseZap" size={17} /></div>
          <div>
            <h2 className="font-display text-[16px] font-semibold leading-none text-bone">Blog Data Ingestion</h2>
            <p className="mt-1.5 text-[12px] leading-snug text-bone-dim">Crawl, chunk &amp; embed every post into the vector index.</p>
          </div>
        </div>

        {/* progress complete */}
        <div className="mb-2 flex items-center justify-between font-mono text-[11px]">
          <span className="text-bone-dim">Complete</span>
          <span className="font-medium" style={{ color: '#9fe0b6' }}>100% complete</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-700">
          <div className="h-full rounded-full" style={{ width: '100%', background: '#54b87a' }}></div>
        </div>

        {/* full log */}
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-bone-dim">
            <Icon name="Terminal" size={12} />
            Live log
          </div>
          <div className="rounded-xl border border-ink-700 bg-ink-900 p-3.5 font-mono text-[12px] leading-relaxed">
            {INGEST_LOG.map((entry, i) => {
              const isDone = entry.at === 100;
              return (
                <div key={i} className="flex gap-2.5 py-0.5">
                  <span className="shrink-0 text-bone-dim">[{entry.t}]</span>
                  <span className={isDone ? 'text-ok' : 'text-bone-soft'}>{isDone ? '✓ ' : ''}{entry.text}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* system stats */}
        <div className="mt-5 border-t border-ink-700 pt-4">
          <div className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-bone-dim">
            <Icon name="Cpu" size={12} />
            System
          </div>
          <div className="grid grid-cols-2 gap-2">
            {SYSTEM_STATS.map((s, i) => (
              <div key={i} className="rounded-lg border border-ink-700 bg-ink-800/60 px-3 py-2.5">
                <div className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-bone-dim">
                  <Icon name={s.icon} size={11} className="text-brand-300" />
                  {s.label}
                </div>
                <div className="font-mono text-[12px] font-medium text-bone">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<PrintApp />);

// Auto-open the print dialog once fonts + render have settled.
(function autoPrint() {
  const go = () => setTimeout(() => window.print(), 600);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => requestAnimationFrame(go));
  } else {
    window.addEventListener('load', go);
  }
})();
