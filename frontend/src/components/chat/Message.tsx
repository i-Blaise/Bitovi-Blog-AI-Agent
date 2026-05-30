import { Bot, Quote, Timer, User } from "lucide-react";
import { renderMarkdown } from "../../lib/markdown";
import type { ChatMessage } from "../../types";
import { SourceCard } from "./SourceCard";

interface Props {
  msg: ChatMessage;
}

export function Message({ msg }: Props) {
  if (msg.role === "user") {
    return (
      <div className="anim-rise flex justify-end">
        <div className="flex max-w-[82%] items-start gap-3">
          <div
            className="rounded-2xl rounded-tr-sm px-4 py-2.5 text-[14.5px] leading-relaxed text-white"
            style={{
              background: "linear-gradient(180deg, #e63329, #cf2c23)",
              boxShadow: "0 8px 24px -12px rgba(230,51,41,0.6)",
            }}
          >
            {msg.text}
          </div>
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-700 text-bone-soft">
            <User size={15} />
          </div>
        </div>
      </div>
    );
  }

  const sources = msg.sources || [];

  return (
    <div className="anim-rise flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink-600 bg-ink-800">
        <Bot size={16} className="text-brand-300" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl rounded-tl-sm border border-ink-600 bg-ink-800/70 px-5 py-4">
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-bone-dim">
              Answer
            </span>
            {msg.genTime && (
              <span className="flex items-center gap-1 font-mono text-[10px] text-bone-dim">
                <Timer size={10} />
                {msg.genTime}
              </span>
            )}
          </div>
          <div className="md text-[14.5px] leading-[1.7] text-bone-soft">
            {renderMarkdown(msg.text, sources)}
          </div>
        </div>

        {sources.length > 0 && (
          <div className="mt-4">
            <div className="mb-2.5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-bone-dim">
              <Quote size={12} />
              Sources
              <span className="rounded-md bg-ink-700 px-1.5 py-0.5 text-[10px] text-bone-soft">
                {sources.length}
              </span>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {sources.map((src, i) => (
                <SourceCard key={`${src.url}-${i}`} source={src} index={i} />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
