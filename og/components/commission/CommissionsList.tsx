"use client";
import { type Commission } from "@/lib/api";

interface Props {
  commissions: Commission[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDrop?: (id: string) => void;
}

const TYPE_COLOR: Record<string, string> = {
  token: "text-accent-lime",
  protocol: "text-accent-blue",
  company: "text-accent-yellow",
  person: "text-accent-orange",
  jurisdiction: "text-accent-red",
  event: "text-ink-light",
  topic: "text-ink-light-muted",
};

export function CommissionsList({ commissions, selectedId, onSelect, onDrop }: Props) {
  return (
    <div>
      <div className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted mb-3">
        ▶ YOUR ACTIVE TOPICS
      </div>
      {commissions.length === 0 ? (
        <div className="border border-ink-light/10 px-4 py-6 text-center font-mono text-label-sm text-ink-light-muted">
          No active commissions yet. Type one above to start.
        </div>
      ) : (
        <div className="border border-ink-light/10 divide-y divide-ink-light/5">
          {commissions.map((c) => {
            const selected = c.id === selectedId;
            return (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={`w-full text-left px-4 py-3 transition-colors flex items-center justify-between gap-4 ${
                  selected ? "bg-accent-lime/10 border-l-2 border-accent-lime" : "hover:bg-bg-dark-2/50"
                }`}
              >
                <div className="min-w-0">
                  <div className="font-mono text-sm text-ink-light truncate">{c.query_text}</div>
                  <div className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted mt-1">
                    <span className={c.entity_type ? TYPE_COLOR[c.entity_type] : "text-ink-light-muted"}>
                      {c.entity_type ?? "—"}
                    </span>
                    {c.entity_id && (
                      <span className="text-ink-light/30"> · {c.entity_id}</span>
                    )}
                  </div>
                </div>
                {onDrop && selected && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDrop(c.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        onDrop(c.id);
                      }
                    }}
                    className="font-mono text-label-sm text-ink-light-muted hover:text-accent-orange cursor-pointer transition-colors"
                  >
                    drop
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
