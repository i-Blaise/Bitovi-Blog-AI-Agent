import { Fragment, type ReactNode } from "react";

import type { Source } from "../types";

type InlinePart =
  | string
  | { kind: "code"; content: string }
  | { kind: "strong"; content: string }
  | { kind: "cite"; num: number };

function inlineParse(str: string): InlinePart[] {
  const parts: InlinePart[] = [];
  str.split(/(`[^`]+`)/g).forEach((seg) => {
    if (seg.startsWith("`") && seg.endsWith("`")) {
      parts.push({ kind: "code", content: seg.slice(1, -1) });
      return;
    }
    seg.split(/(\*\*[^*]+\*\*)/g).forEach((b) => {
      if (b.startsWith("**") && b.endsWith("**")) {
        parts.push({ kind: "strong", content: b.slice(2, -2) });
        return;
      }
      b.split(/(\[\d+\])/g).forEach((c) => {
        const cite = c.match(/^\[(\d+)\]$/);
        if (cite) {
          parts.push({ kind: "cite", num: parseInt(cite[1], 10) });
        } else if (c) {
          parts.push(c);
        }
      });
    });
  });
  return parts;
}

function renderInline(parts: InlinePart[], keyPrefix: string, sources: Source[]): ReactNode[] {
  return parts.map((part, i) => {
    if (typeof part === "string") return <Fragment key={`${keyPrefix}-t${i}`}>{part}</Fragment>;
    if (part.kind === "code") return <code key={`${keyPrefix}-c${i}`}>{part.content}</code>;
    if (part.kind === "strong") return <strong key={`${keyPrefix}-s${i}`}>{part.content}</strong>;
    const url = sources[part.num - 1]?.url;
    return url ? (
      <a
        key={`${keyPrefix}-ref${i}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mx-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded bg-brand/20 px-1 font-mono text-[10px] font-semibold text-brand-300 no-underline transition-colors hover:bg-brand/40 hover:text-white"
      >
        {part.num}
      </a>
    ) : <Fragment key={`${keyPrefix}-ref${i}`}>[{part.num}]</Fragment>;
  });
}

export function renderMarkdown(text: string, sources: Source[] = []): ReactNode[] {
  return text
    .trim()
    .split(/\n{2,}/)
    .map((block, i) => {
      const lines = block.split("\n");
      const parts: ReactNode[] = [];
      let bullets: string[] = [];
      const flush = () => {
        if (bullets.length) {
          const items = bullets.slice();
          parts.push(
            <ul key={`u-${i}-${parts.length}`}>
              {items.map((b, bi) => (
                <li key={bi}>{renderInline(inlineParse(b), `u${i}-${bi}`, sources)}</li>
              ))}
            </ul>
          );
          bullets = [];
        }
      };
      lines.forEach((line, li) => {
        const t = line.trim();
        if (t.startsWith("- ")) {
          bullets.push(t.slice(2));
        } else if (t) {
          flush();
          parts.push(
            <p key={`p-${i}-${li}`}>{renderInline(inlineParse(t), `p${i}${li}`, sources)}</p>
          );
        }
      });
      flush();
      return <Fragment key={i}>{parts}</Fragment>;
    });
}
