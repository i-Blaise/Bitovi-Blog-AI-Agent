import { LoaderCircle, MessagesSquare, Send } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { ChatMessage } from "../../types";
import { EmptyState } from "./EmptyState";
import { Message } from "./Message";

interface Props {
  messages: ChatMessage[];
  isThinking: boolean;
  onSend: (text: string) => void;
}

export function ChatPanel({ messages, isThinking, onSend }: Props) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isThinking]);

  const submit = useCallback(() => {
    const v = draft.trim();
    if (!v || isThinking) return;
    onSend(v);
    setDraft("");
    if (taRef.current) taRef.current.style.height = "auto";
  }, [draft, isThinking, onSend]);

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function onChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setDraft(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
  }

  const empty = messages.length === 0;

  return (
    <section className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-ink-700 bg-ink-850/60 shadow-2xl shadow-black/30 backdrop-blur-sm lg:min-h-0 lg:basis-[65%]">
      <header className="flex items-center justify-between gap-3 border-b border-ink-700 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white"
            style={{ boxShadow: "0 6px 20px -8px rgba(230,51,41,0.7)" }}
          >
            <MessagesSquare size={18} />
          </div>
          <div>
            <h2 className="font-display text-[16px] font-semibold leading-none text-bone">
              Blog Knowledge Assistant
            </h2>
            <p className="mt-1 font-mono text-[10.5px] text-bone-dim">
              grounded in bitovi.com/blog
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-ink-600 bg-ink-800 px-3 py-1.5 font-mono text-[11px] text-ok sm:flex">
          <span
            className="h-1.5 w-1.5 rounded-full bg-ok"
            style={{ animation: "barPulse 1.8s ease-in-out infinite" }}
          />
          index live
        </div>
      </header>

      <div
        ref={scrollRef}
        className="scroll-thin flex-1 space-y-7 overflow-y-auto px-5 py-6"
      >
        {empty && <EmptyState onPick={onSend} />}
        {messages.map((m) => (
          <Message key={m.id} msg={m} />
        ))}
      </div>

      <div className="border-t border-ink-700 bg-ink-850/80 px-4 py-3.5">
        <div
          className={`flex items-end gap-2.5 rounded-xl border px-3 py-2 transition-all duration-300 ${
            isThinking
              ? "border-brand/50 bg-ink-800"
              : "border-ink-600 bg-ink-800 focus-within:border-brand/60"
          }`}
          style={
            isThinking
              ? { boxShadow: "0 0 0 3px rgba(230,51,41,0.08)" }
              : undefined
          }
        >
          {isThinking ? (
            <div className="flex flex-1 items-center gap-3 py-1.5">
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-2 w-2 rounded-full bg-brand"
                    style={{
                      animation: `dotPulse 1.2s ease-in-out ${i * 0.18}s infinite`,
                    }}
                  />
                ))}
              </div>
              <span className="font-mono text-[13px] text-bone-dim">
                Generating answer…
              </span>
            </div>
          ) : (
            <textarea
              ref={taRef}
              rows={1}
              value={draft}
              onChange={onChange}
              onKeyDown={onKeyDown}
              placeholder="Ask anything about Bitovi's engineering blog..."
              className="scroll-thin max-h-[140px] flex-1 resize-none bg-transparent py-1.5 text-[14.5px] leading-relaxed text-bone placeholder:text-bone-dim focus:outline-none"
            />
          )}
          <button
            type="button"
            onClick={submit}
            disabled={isThinking || !draft.trim()}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white transition-all hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              boxShadow:
                !isThinking && draft.trim()
                  ? "0 6px 18px -8px rgba(230,51,41,0.8)"
                  : "none",
            }}
          >
            {isThinking ? (
              <LoaderCircle size={15} className="spin" />
            ) : (
              <Send size={15} />
            )}
            <span className="hidden sm:inline">
              {isThinking ? "Thinking" : "Send"}
            </span>
          </button>
        </div>
        <p className="mt-2 px-1 font-mono text-[10.5px] text-bone-dim">
          <kbd className="rounded border border-ink-600 bg-ink-800 px-1.5 py-0.5 text-bone-soft">
            Enter
          </kbd>{" "}
          to send ·{" "}
          <kbd className="ml-1 rounded border border-ink-600 bg-ink-800 px-1.5 py-0.5 text-bone-soft">
            Shift + Enter
          </kbd>{" "}
          for newline
        </p>
      </div>
    </section>
  );
}
