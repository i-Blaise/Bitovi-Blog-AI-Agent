import { ExternalLink } from "lucide-react";
import { deriveCategory } from "../../lib/styles";
import type { Source } from "../../types";
import { CategoryTag } from "./CategoryTag";

interface Props {
  source: Source;
  index: number;
}

export function SourceCard({ source, index }: Props) {
  const category = source.category || deriveCategory(source.title, source.url);
  const excerpt = source.excerpt;
  const date = source.published_date;

  return (
    <a
      id={`source-${index + 1}`}
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="anim-rise group relative flex flex-col rounded-xl border border-ink-600 bg-ink-800/70 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:bg-ink-750"
      style={{
        animationDelay: `${0.05 * index + 0.05}s`,
        boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset",
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-brand/15 font-mono text-[10px] font-medium text-brand-300">
          {index + 1}
        </span>
        <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-bone-dim">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-brand" />
          bitovi.com
        </div>
        <ExternalLink
          size={13}
          className="ml-auto text-bone-dim transition-colors group-hover:text-brand-300"
        />
      </div>
      <h4 className="font-display text-[14px] font-semibold leading-snug text-bone group-hover:text-white">
        {source.title}
      </h4>
      {excerpt && (
        <p className="mt-1.5 text-[12px] leading-relaxed text-bone-dim line-clamp-2">
          {excerpt}
        </p>
      )}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-ink-700 pt-2.5">
        <div className="flex items-center gap-2">
          <CategoryTag category={category} />
          {date && (
            <span className="font-mono text-[10px] text-bone-dim">{date}</span>
          )}
        </div>
      </div>
    </a>
  );
}
