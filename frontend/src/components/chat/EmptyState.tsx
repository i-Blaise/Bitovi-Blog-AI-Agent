import { FlaskConical, Newspaper, Server, Sparkles, type LucideIcon } from "lucide-react";
import { EXAMPLE_QUESTIONS } from "../../lib/styles";

const ICONS: Record<string, LucideIcon> = {
  Newspaper,
  Server,
  Sparkles,
  FlaskConical,
};

interface Props {
  onPick: (q: string) => void;
}

export function EmptyState({ onPick }: Props) {
  return (
    <div className="anim-fade flex h-full flex-col items-center justify-center text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-ink-600 bg-ink-800">
        <Sparkles size={24} className="text-brand-300" />
      </div>
      <h3 className="font-display text-[23px] font-semibold text-bone">
        Ask the Bitovi blog anything
      </h3>
      <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-bone-dim">
        Every answer is retrieved from Bitovi's indexed blog posts and cited back to the source article.
      </p>
      <div className="mt-6 grid w-full max-w-xl gap-2.5 sm:grid-cols-2">
        {EXAMPLE_QUESTIONS.map((q, i) => {
          const Icon = ICONS[q.icon] || Sparkles;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onPick(q.text)}
              className="anim-rise group flex items-center gap-3 rounded-xl border border-ink-600 bg-ink-800/70 px-3.5 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:bg-ink-750"
              style={{ animationDelay: `${0.07 * i + 0.1}s` }}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink-700 text-bone-dim group-hover:text-brand-300">
                <Icon size={14} />
              </span>
              <span className="text-[13px] leading-snug text-bone-soft group-hover:text-bone">
                {q.text}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
