import { CheckCheck, X } from "lucide-react";
import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function Toast({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(onClose, 5000);
    return () => clearTimeout(id);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="anim-slide-right fixed right-4 top-4 z-50 w-[330px] max-w-[calc(100vw-2rem)]">
      <div className="flex items-start gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4 shadow-2xl shadow-black/60">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{
            background: "rgba(84,184,122,0.14)",
            border: "1px solid rgba(84,184,122,0.4)",
          }}
        >
          <CheckCheck size={18} className="text-ok" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-display text-[14.5px] font-semibold text-bone">
            Ingestion complete
          </h4>
          <p className="mt-0.5 text-[12.5px] leading-snug text-bone-dim">
            The knowledge base has been refreshed and is ready to query.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-bone-dim transition-colors hover:text-bone"
        >
          <X size={16} />
        </button>
      </div>
      <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-ink-700">
        <div
          className="h-full bg-ok"
          style={{ width: "100%", animation: "shrinkBar 5s linear forwards" }}
        />
      </div>
    </div>
  );
}
