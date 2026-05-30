import { Fragment, type ReactNode } from "react";

type InlinePart = string | { kind: "code"; content: string } | { kind: "strong"; content: string };

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
      } else if (b) {
        parts.push(b);
      }
    });
  });
  return parts;
}

function renderInline(parts: InlinePart[], keyPrefix: string): ReactNode[] {
  return parts.map((part, i) => {
    if (typeof part === "string") {
      return <Fragment key={`${keyPrefix}-t${i}`}>{part}</Fragment>;
    }
    if (part.kind === "code") return <code key={`${keyPrefix}-c${i}`}>{part.content}</code>;
    return <strong key={`${keyPrefix}-s${i}`}>{part.content}</strong>;
  });
}

export function renderMarkdown(text: string): ReactNode[] {
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
                <li key={bi}>{renderInline(inlineParse(b), `u${i}-${bi}`)}</li>
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
            <p key={`p-${i}-${li}`}>{renderInline(inlineParse(t), `p${i}${li}`)}</p>
          );
        }
      });
      flush();
      return <Fragment key={i}>{parts}</Fragment>;
    });
}
