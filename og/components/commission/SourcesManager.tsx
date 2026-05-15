"use client";
import { useCallback, useEffect, useState } from "react";
import {
  listSources,
  createSource,
  patchSource,
  deleteSource,
  type Source,
  type SourceKind,
} from "@/lib/api";

interface Props {
  commissionId: string | null;
}

function relTime(ms: number | null): string {
  if (!ms) return "never";
  const delta = Math.max(0, Date.now() - ms);
  const m = Math.floor(delta / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function SourcesManager({ commissionId }: Props) {
  const [sources, setSources] = useState<Source[]>([]);
  const [kind, setKind] = useState<SourceKind>("rss");
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!commissionId) {
      setSources([]);
      return;
    }
    try {
      const { sources: list } = await listSources(commissionId);
      setSources(list);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [commissionId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commissionId || !url.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await createSource(commissionId, kind, url.trim(), label.trim() || undefined);
      setUrl("");
      setLabel("");
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handlePatch = async (id: number, patch: Partial<{ active: number; preference: number }>) => {
    if (!commissionId) return;
    try {
      await patchSource(commissionId, id, patch);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!commissionId) return;
    try {
      await deleteSource(commissionId, id);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (!commissionId) return null;

  return (
    <div className="border border-ink-light/10 bg-bg-dark-2/30">
      <div className="px-4 py-3 border-b border-ink-light/10 font-mono text-label-sm uppercase tracking-widest text-ink-light-muted flex items-center justify-between">
        <span>▶ YOUR SOURCES</span>
        <span className="normal-case tracking-normal">{sources.length}</span>
      </div>

      <form onSubmit={handleAdd} className="px-4 py-3 border-b border-ink-light/10 space-y-2 font-mono text-label-sm">
        <div className="flex gap-2">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as SourceKind)}
            className="bg-bg-dark-2 border border-ink-light/10 px-2 py-1 text-ink-light"
          >
            <option value="rss">RSS</option>
            <option value="youtube">YouTube</option>
          </select>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={kind === "rss" ? "https://example.com/feed.xml" : "UCxxxx... or channel URL"}
            className="flex-1 bg-bg-dark-2 border border-ink-light/10 px-2 py-1 text-ink-light placeholder:text-ink-light-muted/50"
          />
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="label (optional)"
            className="flex-1 bg-bg-dark-2 border border-ink-light/10 px-2 py-1 text-ink-light placeholder:text-ink-light-muted/50"
          />
          <button
            type="submit"
            disabled={busy || !url.trim()}
            className="px-3 py-1 bg-accent-lime text-bg-dark uppercase tracking-widest hover:bg-accent-lime-bright disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {busy ? "…" : "add"}
          </button>
        </div>
        {error && (
          <div className="text-accent-orange">▶ {error}</div>
        )}
      </form>

      {sources.length === 0 ? (
        <div className="px-4 py-6 text-center font-mono text-label-sm text-ink-light-muted">
          ▶ no custom sources yet — agent uses cached news + Google fallback
        </div>
      ) : (
        <div className="divide-y divide-ink-light/5 font-mono text-label-sm">
          {sources.map((s) => {
            const ok = !s.last_error;
            const pref = s.preference;
            return (
              <div key={s.id} className="px-4 py-2 flex items-center gap-3">
                <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${ok ? "bg-accent-lime" : "bg-accent-orange"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-ink-light truncate">
                    {s.label ?? s.url}
                  </div>
                  <div className="text-ink-light-muted text-[10px] uppercase tracking-widest">
                    {s.kind} · {relTime(s.last_fetched_at)}{s.last_item_count !== null ? ` · ${s.last_item_count} items` : ""}
                    {s.last_error ? ` · ${s.last_error.slice(0, 50)}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePatch(s.id, { preference: pref === 1 ? 0 : 1 })}
                    title="prefer"
                    className={`px-1 ${pref === 1 ? "text-accent-lime" : "text-ink-light-muted hover:text-ink-light"}`}
                  >
                    ★
                  </button>
                  <button
                    onClick={() => handlePatch(s.id, { active: s.active ? 0 : 1 })}
                    title={s.active ? "mute" : "unmute"}
                    className={`px-1 ${s.active ? "text-ink-light-muted hover:text-accent-orange" : "text-accent-orange hover:text-ink-light"}`}
                  >
                    {s.active ? "◐" : "○"}
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    title="remove"
                    className="px-1 text-ink-light-muted hover:text-accent-orange"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
