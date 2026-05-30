import { ShieldCheck } from "lucide-react";

export function Header() {
  return (
    <div className="anim-fade mb-4 flex shrink-0 items-center justify-between">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand font-display text-[20px] text-white"
          style={{
            fontWeight: 700,
            boxShadow: "0 8px 24px -10px rgba(230,51,41,0.8)",
          }}
        >
          b
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-[20px] font-bold leading-none text-bone">
              Bitovi
            </h1>
            <span className="rounded-md border border-ink-600 bg-ink-800 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-bone-dim">
              RAG Chat
            </span>
          </div>
          <p className="mt-1.5 hidden font-mono text-[11px] text-bone-dim sm:block">
            Ask the engineering blog. Get cited, confidence-scored answers.
          </p>
        </div>
      </div>
      <div className="hidden items-center gap-2 font-mono text-[11px] text-bone-dim md:flex">
        <ShieldCheck size={14} className="text-ok" />
        internal preview · v0.5
      </div>
    </div>
  );
}
