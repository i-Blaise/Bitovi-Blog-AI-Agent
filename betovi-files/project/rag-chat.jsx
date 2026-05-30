/* global React, Icon, renderMarkdown, EXAMPLE_QUESTIONS, CERTAINTY_STYLES, CATEGORY_STYLES, relevanceColor */
const { useState, useEffect, useRef, useCallback } = React;

// ── Certainty badge with hover tooltip ─────────────────────────────────────
function CertaintyBadge({ certainty, score }) {
  const s = CERTAINTY_STYLES[certainty];
  return (
    <div className="tip inline-flex">
      <span
        className="inline-flex cursor-help items-center gap-1.5 rounded-full pl-1.5 pr-2.5 py-1 text-[11px] font-mono font-medium tracking-wide"
        style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }}></span>
        <span>{certainty}</span>
        <span className="opacity-50">·</span>
        <span>{score}%</span>
      </span>
      <div className="tip-body">
        <div className="rounded-xl border border-ink-600 bg-ink-800 p-3.5 shadow-2xl shadow-black/60">
          <div className="mb-1.5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest" style={{ color: s.text }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }}></span>
            {s.label}
          </div>
          <p className="text-[12.5px] leading-relaxed text-bone-soft">{s.blurb}</p>
        </div>
      </div>
    </div>
  );
}

// ── Retrieval transparency strip ────────────────────────────────────────────
function Metric({ icon, label, value, valueColor }) {
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2">
      <Icon name={icon} size={15} className="shrink-0 text-bone-dim" />
      <div className="leading-none">
        <div className="font-mono text-[13px] font-medium" style={{ color: valueColor || '#f0ede8' }}>{value}</div>
        <div className="mt-1 font-mono text-[9.5px] uppercase tracking-widest text-bone-dim">{label}</div>
      </div>
    </div>
  );
}

function TransparencyStrip({ msg }) {
  const ret = msg.metrics.retrieval;
  return (
    <div className="mt-2.5 flex flex-wrap items-stretch overflow-hidden rounded-xl border border-ink-700 bg-ink-850/60 divide-x divide-ink-700">
      <Metric icon="Layers" label="Chunks retrieved" value={msg.metrics.chunks} />
      <Metric icon="Gauge" label="Retrieval score" value={ret + '%'} valueColor={relevanceColor(ret)} />
      <Metric icon="Timer" label="Generation" value={msg.genTime} />
      <Metric icon="BookText" label="Sources used" value={msg.sources.length} />
    </div>
  );
}

// ── Category tag + relevance meter ──────────────────────────────────────────
function CategoryTag({ category }) {
  const c = CATEGORY_STYLES[category] || { dot: '#8d8a85' };
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-ink-600 bg-ink-850 px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-bone-soft">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.dot }}></span>
      {category}
    </span>
  );
}

function RelevanceMeter({ value, compact }) {
  const color = relevanceColor(value);
  return (
    <div className="flex items-center gap-1.5" title={`Relevance ${value}%`}>
      {!compact && <span className="font-mono text-[9.5px] uppercase tracking-widest text-bone-dim">Match</span>}
      <div className="h-1 w-9 overflow-hidden rounded-full bg-ink-700">
        <div className="h-full rounded-full" style={{ width: value + '%', background: color }}></div>
      </div>
      <span className="font-mono text-[10.5px] font-medium" style={{ color }}>{value}</span>
    </div>
  );
}

// ── Perplexity-style source citation card ───────────────────────────────────
function SourceCard({ source, index }) {
  const url = `https://www.bitovi.com/blog/${source.slug}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="anim-rise group relative flex flex-col rounded-xl border border-ink-600 bg-ink-800/70 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:bg-ink-750"
      style={{ animationDelay: `${0.05 * index + 0.05}s`, boxShadow: '0 1px 0 rgba(255,255,255,0.02) inset' }}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-brand/15 font-mono text-[10px] font-medium text-brand-300">{index + 1}</span>
        <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-bone-dim">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-brand"></span>
          bitovi.com
        </div>
        <Icon name="ExternalLink" size={13} className="ml-auto text-bone-dim transition-colors group-hover:text-brand-300" />
      </div>
      <h4 className="font-display text-[14px] font-semibold leading-snug text-bone group-hover:text-white">{source.title}</h4>
      <p className="mt-1.5 text-[12px] leading-relaxed text-bone-dim line-clamp-2">{source.excerpt}</p>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-ink-700 pt-2.5">
        <div className="flex items-center gap-2">
          <CategoryTag category={source.category} />
          <span className="font-mono text-[10px] text-bone-dim">{source.date}</span>
        </div>
        <RelevanceMeter value={source.relevance} compact />
      </div>
    </a>
  );
}

// ── Collapsible retrieved-context inspector ─────────────────────────────────
function RetrievedContext({ chunks }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2.5 overflow-hidden rounded-xl border border-ink-700 bg-ink-850/40">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-ink-800/60"
      >
        <Icon name="ScanSearch" size={15} className="text-bone-dim" />
        <span className="font-mono text-[11px] uppercase tracking-widest text-bone-soft">Retrieved context</span>
        <span className="rounded-md bg-ink-700 px-1.5 py-0.5 font-mono text-[10px] text-bone-dim">{chunks.length} chunks</span>
        <Icon name="ChevronDown" size={16} className="ml-auto text-bone-dim transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      {open && (
        <div className="anim-fade space-y-2 border-t border-ink-700 px-3.5 py-3">
          {chunks.map((c, i) => (
            <div key={i} className="rounded-lg border border-ink-700 bg-ink-900 p-3" style={{ borderLeft: `2px solid ${relevanceColor(c.score)}` }}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-mono text-[10px] text-bone-dim">
                  <Icon name="FileCode2" size={11} />
                  /blog/{c.source}
                </span>
                <span className="flex items-center gap-1.5 font-mono text-[10px]">
                  <span className="uppercase tracking-widest text-bone-dim">score</span>
                  <span className="font-medium" style={{ color: relevanceColor(c.score) }}>{(c.score / 100).toFixed(2)}</span>
                </span>
              </div>
              <p className="text-[12px] leading-relaxed text-bone-soft">{c.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Typing indicator ────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="anim-fade flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink-600 bg-ink-800">
        <Icon name="Bot" size={16} className="text-brand-300" />
      </div>
      <div className="flex flex-col gap-1.5 rounded-2xl rounded-tl-sm border border-ink-600 bg-ink-800 px-4 py-3">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-1.5 w-1.5 rounded-full bg-bone-soft" style={{ animation: `dotPulse 1.2s ease-in-out ${i * 0.16}s infinite` }}></span>
          ))}
        </div>
        <span className="font-mono text-[10.5px] text-bone-dim">searching index · ranking chunks · generating</span>
      </div>
    </div>
  );
}

// ── A single message ────────────────────────────────────────────────────────
function Message({ msg }) {
  if (msg.role === 'user') {
    return (
      <div className="anim-rise flex justify-end">
        <div className="flex max-w-[82%] items-start gap-3">
          <div className="rounded-2xl rounded-tr-sm px-4 py-2.5 text-[14.5px] leading-relaxed text-white" style={{ background: 'linear-gradient(180deg, #e63329, #cf2c23)', boxShadow: '0 8px 24px -12px rgba(230,51,41,0.6)' }}>
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
    <div className="anim-rise flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink-600 bg-ink-800">
        <Icon name="Bot" size={16} className="text-brand-300" />
      </div>
      <div className="min-w-0 flex-1">
        {/* answer */}
        <div className="rounded-2xl rounded-tl-sm border border-ink-600 bg-ink-800/70 px-5 py-4">
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-bone-dim">Answer</span>
            <CertaintyBadge certainty={msg.certainty} score={msg.score} />
          </div>
          <div className="md text-[14.5px] leading-[1.7] text-bone-soft">{renderMarkdown(msg.text)}</div>
        </div>

        {/* retrieval transparency */}
        <TransparencyStrip msg={msg} />

        {/* sources */}
        <div className="mt-4">
          <div className="mb-2.5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-bone-dim">
            <Icon name="Quote" size={12} />
            Sources
            <span className="rounded-md bg-ink-700 px-1.5 py-0.5 text-[10px] text-bone-soft">{msg.sources.length}</span>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {msg.sources.map((src, i) => (
              <SourceCard key={i} source={src} index={i} />
            ))}
          </div>
        </div>

        {/* retrieved context inspector */}
        <RetrievedContext chunks={msg.retrievedChunks} />
      </div>
    </div>
  );
}

// ── Chat panel (left) ───────────────────────────────────────────────────────
function ChatPanel({ messages, isThinking, onSend }) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef(null);
  const taRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, isThinking]);

  const submit = useCallback(() => {
    const v = draft.trim();
    if (!v || isThinking) return;
    onSend(v);
    setDraft('');
    if (taRef.current) taRef.current.style.height = 'auto';
  }, [draft, isThinking, onSend]);

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  };
  const onChange = (e) => {
    setDraft(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
  };

  const empty = messages.length === 0;

  return (
    <section className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-ink-700 bg-ink-850/60 shadow-2xl shadow-black/30 backdrop-blur-sm lg:min-h-0 lg:basis-[65%]">
      <header className="flex items-center justify-between gap-3 border-b border-ink-700 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white" style={{ boxShadow: '0 6px 20px -8px rgba(230,51,41,0.7)' }}>
            <Icon name="MessagesSquare" size={18} />
          </div>
          <div>
            <h2 className="font-display text-[16px] font-semibold leading-none text-bone">Blog Knowledge Assistant</h2>
            <p className="mt-1 font-mono text-[10.5px] text-bone-dim">Retrieval-augmented · grounded in bitovi.com/blog</p>
          </div>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-ink-600 bg-ink-800 px-3 py-1.5 font-mono text-[11px] text-ok sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-ok" style={{ animation: 'barPulse 1.8s ease-in-out infinite' }}></span>
          index live
        </div>
      </header>

      <div ref={scrollRef} className="scroll-thin flex-1 space-y-7 overflow-y-auto px-5 py-6">
        {empty && (
          <div className="anim-fade flex h-full flex-col items-center justify-center text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-ink-600 bg-ink-800">
              <Icon name="Sparkles" size={24} className="text-brand-300" />
            </div>
            <h3 className="font-display text-[23px] font-semibold text-bone">Ask the Bitovi blog anything</h3>
            <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-bone-dim">
              Every answer is retrieved from indexed engineering posts, scored for confidence, and fully cited.
            </p>
            <div className="mt-6 grid w-full max-w-xl gap-2.5 sm:grid-cols-2">
              {EXAMPLE_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => onSend(q.text)}
                  className="anim-rise group flex items-center gap-3 rounded-xl border border-ink-600 bg-ink-800/70 px-3.5 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:bg-ink-750"
                  style={{ animationDelay: `${0.07 * i + 0.1}s` }}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink-700 text-bone-dim group-hover:text-brand-300">
                    <Icon name={q.icon} size={14} />
                  </span>
                  <span className="text-[13px] leading-snug text-bone-soft group-hover:text-bone">{q.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <Message key={m.id} msg={m} />
        ))}
        {isThinking && <TypingDots />}
      </div>

      <div className="border-t border-ink-700 bg-ink-850/80 px-4 py-3.5">
        <div className="flex items-end gap-2.5 rounded-xl border border-ink-600 bg-ink-800 px-3 py-2 transition-colors focus-within:border-brand/60">
          <textarea
            ref={taRef}
            rows={1}
            value={draft}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder="Ask anything about Bitovi's engineering blog..."
            className="scroll-thin max-h-[140px] flex-1 resize-none bg-transparent py-1.5 text-[14.5px] leading-relaxed text-bone placeholder:text-bone-dim focus:outline-none"
          ></textarea>
          <button
            onClick={submit}
            disabled={!draft.trim() || isThinking}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white transition-all hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ boxShadow: draft.trim() && !isThinking ? '0 6px 18px -8px rgba(230,51,41,0.8)' : 'none' }}
          >
            <Icon name="Send" size={15} />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
        <p className="mt-2 px-1 font-mono text-[10.5px] text-bone-dim">
          <kbd className="rounded border border-ink-600 bg-ink-800 px-1.5 py-0.5 text-bone-soft">Enter</kbd> to send ·
          <kbd className="ml-1 rounded border border-ink-600 bg-ink-800 px-1.5 py-0.5 text-bone-soft">Shift + Enter</kbd> for newline
        </p>
      </div>
    </section>
  );
}

Object.assign(window, { ChatPanel });
