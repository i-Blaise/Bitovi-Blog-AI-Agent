import {
  Activity,
  Boxes,
  Clock,
  FileText,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getStats } from "../../api/client";
import type { SystemStats } from "../../types";

interface StatCardProps {
  Icon: LucideIcon;
  label: string;
  value: string;
  unit: string;
}

function StatCard({ Icon, label, value, unit }: StatCardProps) {
  return (
    <div className="rounded-lg border border-ink-700 bg-ink-800/50 px-3 py-2.5 transition-colors hover:border-ink-600">
      <div className="mb-1.5 flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-wider text-bone-dim">
        <Icon size={11} className="text-brand-300" />
        {label}
      </div>
      <div
        className="truncate font-mono text-[12px] font-medium text-bone"
        title={value}
      >
        {value}
      </div>
      <div className="mt-0.5 font-mono text-[10px] text-bone-dim">{unit}</div>
    </div>
  );
}

interface ObservabilityProps {
  refreshKey?: number;
}

export function Observability({ refreshKey = 0 }: ObservabilityProps) {
  const [stats, setStats] = useState<SystemStats>({});

  useEffect(() => {
    getStats().then(setStats).catch(() => setStats({}));
  }, [refreshKey]);

  return (
    <div className="border-t border-ink-700 px-5 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-bone-dim">
          <Activity size={12} />
          Observability
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-ok/30 bg-ok/10 px-2 py-0.5 font-mono text-[10px] text-ok">
          <span
            className="h-1.5 w-1.5 rounded-full bg-ok"
            style={{ animation: "barPulse 1.8s ease-in-out infinite" }}
          />
          healthy
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          Icon={FileText}
          label="Indexed articles"
          value={stats.indexed_articles ? String(stats.indexed_articles) : "—"}
          unit="documents"
        />
        <StatCard
          Icon={Clock}
          label="Last indexed"
          value={stats.last_indexed || "—"}
          unit="cached articles.json"
        />
        <StatCard
          Icon={Boxes}
          label="Embedding model"
          value={stats.embedding_model || "text-embedding-3-small"}
          unit="1536-dim"
        />
        <StatCard
          Icon={Sparkles}
          label="Generation model"
          value={stats.generation_model || "gpt-4o-mini"}
          unit="temp 0"
        />
      </div>
    </div>
  );
}
