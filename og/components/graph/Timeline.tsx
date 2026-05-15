"use client";
import { type GraphEdge } from "@/lib/api";

interface Props {
  edges: GraphEdge[];
  onEdgeClick: (edge: GraphEdge) => void;
}

function relTime(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function Timeline({ edges, onEdgeClick }: Props) {
  const recent = [...edges].sort((a, b) => b.observed_at - a.observed_at).slice(0, 8);

  return (
    <div>
      <div className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted mb-3">
        ▶ TIMELINE
      </div>
      {recent.length === 0 ? (
        <div className="border border-ink-light/10 px-4 py-6 text-center font-mono text-label-sm text-ink-light-muted">
          No edges yet for this commission. Trigger a run to populate.
        </div>
      ) : (
        <div className="border border-ink-light/10 divide-y divide-ink-light/5">
          {recent.map((e) => (
            <button
              key={e.id}
              onClick={() => onEdgeClick(e)}
              className="w-full text-left px-4 py-3 hover:bg-bg-dark-2/50 transition-colors flex items-start justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="font-mono text-label-sm text-ink-light truncate">
                  <span className="text-ink-light-muted">{e.src_id}</span>{" "}
                  <span className="text-accent-lime">─{e.type}→</span>{" "}
                  <span className="text-ink-light-muted">{e.dst_id}</span>
                </div>
                {e.evidence && (
                  <div className="font-mono text-label-sm text-ink-light-muted mt-1 line-clamp-1 italic">
                    {e.evidence}
                  </div>
                )}
              </div>
              <div className="font-mono text-label-sm text-ink-light-muted whitespace-nowrap">
                {relTime(e.observed_at)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
