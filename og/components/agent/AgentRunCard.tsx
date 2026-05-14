"use client";
import { useCallback, useEffect, useState } from "react";
import {
  fetchAgentStatus,
  fetchAgentLog,
  triggerAgentRun,
  type AgentRunResult,
  type AgentActivityEvent,
  type AgentStatusResponse,
} from "@/lib/api";

const ACTION_COLOR: Record<AgentActivityEvent["action"], string> = {
  SCAN: "text-accent-blue",
  PICK: "text-accent-yellow",
  WRITE: "text-accent-lime-bright",
  DONE: "text-accent-lime",
  ERROR: "text-accent-orange",
};

const TYPE_COLOR: Record<string, string> = {
  person: "text-accent-yellow",
  organization: "text-accent-blue",
  technology: "text-accent-lime",
  event: "text-accent-orange",
  place: "text-ink-light-muted",
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", { hour12: false });
}

export function AgentRunCard() {
  const [status, setStatus] = useState<AgentStatusResponse | null>(null);
  const [events, setEvents] = useState<AgentActivityEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AgentRunResult | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [s, l] = await Promise.all([fetchAgentStatus(), fetchAgentLog(15)]);
      setStatus(s);
      setEvents(l.events);
      if (s.lastResult && !result) setResult(s.lastResult);
    } catch {
      // backend probably down — silent until user clicks Run
    }
  }, [result]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, running ? 1500 : 5000);
    return () => clearInterval(id);
  }, [refresh, running]);

  const onRun = async () => {
    setError(null);
    setRunning(true);
    try {
      const r = await triggerAgentRun();
      setResult(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
      refresh();
    }
  };

  const available = status?.inference.available ?? false;
  const model = status?.inference.model;

  return (
    <div className="border border-ink-light/10 p-6 mb-12">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted mb-1">
            ▶ AGENT PIPELINE
          </div>
          <h2 className="font-display text-h2 font-bold">Run the agent once</h2>
          <p className="text-ink-light-muted text-sm mt-1">
            Picks the top-ranked news item and asks 0G Compute for an editorial + entities.
          </p>
        </div>
        <button
          onClick={onRun}
          disabled={running || !available}
          className="font-mono text-label uppercase tracking-widest px-6 py-3 bg-accent-lime text-ink-dark hover:bg-accent-lime-bright disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          {running ? "▶ Running..." : "▶ Run agent now"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-label-sm text-ink-light-muted mb-6">
        <span className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${available ? "bg-accent-lime" : "bg-accent-orange"}`} />
          0G inference {available ? "available" : "unavailable"}
        </span>
        {model && <span>model: <span className="text-ink-light">{model}</span></span>}
        {status?.running && <span className="text-accent-lime">▶ pipeline running</span>}
      </div>

      {error && (
        <div className="border border-accent-orange/60 bg-accent-orange/10 px-4 py-3 mb-6 font-mono text-sm">
          ▶ {error}
        </div>
      )}

      {events.length > 0 && (
        <div className="bg-bg-dark-2 border border-ink-light/5 mb-6 max-h-48 overflow-y-auto font-mono text-xs">
          {events.map((e, i) => (
            <div key={i} className="flex gap-3 px-4 py-1.5 border-b border-ink-light/5 last:border-0">
              <span className="text-ink-light-muted opacity-60 shrink-0">{formatTime(e.timestamp)}</span>
              <span className={`shrink-0 ${ACTION_COLOR[e.action]}`}>▶ {e.action}</span>
              <span className="text-ink-light-muted truncate">{e.detail}</span>
            </div>
          ))}
        </div>
      )}

      {result && (
        <div className="border-t border-ink-light/10 pt-6">
          <div className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted mb-3">
            ▶ LATEST OUTPUT · {result.durationMs}ms · {result.usage?.totalTokens ?? "?"} tokens
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="font-mono text-label-sm text-accent-lime uppercase tracking-widest mb-2">
                ▶ PICKED · {result.pickedItem.source.name}
              </div>
              <a
                href={result.pickedItem.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-display text-h3 font-bold leading-tight hover:text-accent-lime transition-colors"
              >
                {result.pickedItem.title}
              </a>
              <p className="mt-3 text-ink-light-muted text-sm line-clamp-3">
                {result.pickedItem.summary}
              </p>
            </div>

            <div>
              <div className="font-mono text-label-sm text-accent-lime uppercase tracking-widest mb-2">
                ▶ EDITORIAL
              </div>
              <p className="text-ink-light leading-relaxed">{result.editorial.editorial}</p>

              <div className="mt-4">
                <div className="font-mono text-label-sm text-ink-light-muted uppercase tracking-widest mb-2">
                  ▶ ENTITIES
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.editorial.entities.map((e) => (
                    <span
                      key={e.name}
                      className={`font-mono text-xs px-2 py-1 border border-ink-light/10 ${TYPE_COLOR[e.type] ?? "text-ink-light-muted"}`}
                      title={e.description}
                    >
                      {e.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <div className="font-mono text-label-sm text-ink-light-muted uppercase tracking-widest mb-2">
                  ▶ ILLUSTRATION PROMPT
                </div>
                <p className="text-xs text-ink-light-muted italic leading-relaxed">
                  {result.editorial.illustrationPrompt}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
