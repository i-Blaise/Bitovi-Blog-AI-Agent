import { CATEGORY_STYLES } from "../../lib/styles";

interface Props {
  category: string;
}

export function CategoryTag({ category }: Props) {
  const c = CATEGORY_STYLES[category] || { dot: "#8d8a85" };
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-ink-600 bg-ink-850 px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-bone-soft">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.dot }} />
      {category}
    </span>
  );
}
