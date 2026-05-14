"use client";
import { useEffect, useState } from "react";
import type { ActivityEntry } from "@/lib/types";
import { MOCK_ACTIVITY } from "@/lib/mock";

const ACTION_COLORS: Record<string, string> = {
  SCANNING: "text-accent-lime-bright",
  PICKED: "text-accent-yellow",
  CONCEPT: "text-accent-orange",
  GENERATE: "text-accent-lime",
  CRITIQUE: "text-accent-lime",
  ARCHIVE: "text-accent-blue",
  RECORD: "text-accent-blue",
  PUBLISH: "text-accent-lime-bright",
};

export function LiveFeed({ maxHeight = "24rem" }: { maxHeight?: string }) {
  const [entries, setEntries] = useState<ActivityEntry[]>(MOCK_ACTIVITY);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/agent-status");
        if (res.ok) {
          const data = await res.json();
          if (data.recentActivity?.length) setEntries(data.recentActivity);
        }
      } catch {
        // fallback to mock
      }
    };
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="bg-bg-dark border border-ink-light/10 font-mono text-sm overflow-y-auto"
      style={{ maxHeight }}
    >
      <div className="sticky top-0 bg-bg-dark border-b border-ink-light/10 px-4 py-2 flex items-center gap-2">
        <span className="w-2 h-2 bg-accent-lime rounded-full animate-pulse" />
        <span className="text-label-sm uppercase tracking-widest text-ink-light-muted">LIVE FEED</span>
      </div>
      <div className="p-2">
        {entries.map((e, i) => (
          <div key={i} className="flex gap-3 hover:bg-ink-light/5 px-2 py-1.5 rounded items-baseline">
            <span className="text-ink-light-muted opacity-50 shrink-0">[{e.timestamp}]</span>
            <span className={`shrink-0 ${ACTION_COLORS[e.action] ?? "text-accent-lime"}`}>
              &#9654; {e.action}
            </span>
            <span className="text-ink-light-muted">{e.detail}</span>
            {e.txHash && (
              <a
                href={`https://scan.0g.ai/tx/${e.txHash}`}
                target="_blank"
                rel="noopener"
                className="ml-auto text-accent-lime/60 hover:text-accent-lime transition-colors shrink-0 text-xs"
              >
                {e.txHash.slice(0, 8)}... &#8599;
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
