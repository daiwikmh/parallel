"use client";
import { useCallback, useEffect, useState } from "react";
import { SourceCard } from "@/components/feed/SourceCard";
import { fetchNews, type NewsResponse, type NewsSourceKind } from "@/lib/api";

const KIND_FILTERS: { value: NewsSourceKind | "all"; label: string }[] = [
  { value: "all", label: "All sources" },
  { value: "rss", label: "RSS" },
  { value: "hackernews", label: "Hacker News" },
  { value: "reddit", label: "Reddit" },
  { value: "github", label: "GitHub" },
  { value: "googleNews", label: "Google News" },
];

export default function SourcesPage() {
  const [data, setData] = useState<NewsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeKind, setActiveKind] = useState<NewsSourceKind | "all">("all");

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchNews({ limit: 100, force });
      setData(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = data?.items.filter(
    (it) => activeKind === "all" || it.source.kind === activeKind,
  ) ?? [];

  return (
    <main className="min-h-screen bg-bg-cream text-ink-dark">
      <div className="pt-8 pb-16 px-6 max-w-7xl mx-auto">
          <div className="mb-4">
            <span className="font-mono text-label-sm uppercase tracking-widest text-ink-dark-muted">
              &#9654; AGENT INBOX
            </span>
          </div>
          <h1 className="font-display font-bold text-h1 mb-2">
            What the agent is reading right now
          </h1>
          <p className="text-ink-dark-muted mb-12 max-w-2xl">
            Live output from the news worker. Ranked by topic relevance, social signal, and freshness.
            This is the raw pipeline before the agent writes its editorial take.
          </p>

          <div className="sticky top-12 z-30 bg-bg-cream/90 backdrop-blur-sm border-b border-ink-dark/10 -mx-6 px-6 py-4 mb-12 flex items-center gap-4 flex-wrap">
            <div className="flex gap-2 flex-wrap">
              {KIND_FILTERS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setActiveKind(t.value)}
                  className={`font-mono text-label-sm uppercase tracking-widest px-4 py-2 rounded transition-colors cursor-pointer ${
                    activeKind === t.value
                      ? "bg-bg-dark text-ink-light"
                      : "text-ink-dark-muted hover:text-ink-dark"
                  }`}
                >
                  &#9654; {t.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => load(true)}
              disabled={loading}
              className="ml-auto font-mono text-label-sm uppercase tracking-widest px-4 py-2 border border-ink-dark/20 hover:border-accent-lime hover:text-accent-lime transition-colors disabled:opacity-50 cursor-pointer"
            >
              &#9654; {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {data && (
            <div className="mb-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-label-sm">
              {data.providers.map((p) => (
                <div
                  key={p.provider}
                  className={`border px-3 py-2 ${p.ok ? "border-ink-dark/10" : "border-accent-orange/60"}`}
                >
                  <div className="uppercase tracking-widest text-ink-dark-muted">{p.provider}</div>
                  <div className="text-ink-dark">
                    {p.ok ? `${p.count} items` : `error`}
                  </div>
                  {p.error && (
                    <div className="text-accent-orange text-[10px] truncate" title={p.error}>
                      {p.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="border border-accent-orange/60 bg-accent-orange/10 px-4 py-3 mb-8 font-mono text-sm text-ink-dark">
              &#9654; {error}
              <div className="text-ink-dark-muted text-label-sm mt-1">
                Is the backend reachable at the proxy (<code>/api/_back</code>)?
              </div>
            </div>
          )}

          {!data && !error && (
            <div className="text-center py-24 font-mono text-ink-dark-muted">
              &#9654; Loading agent inbox...
            </div>
          )}

          {data && filtered.length === 0 && (
            <div className="text-center py-24 font-mono text-ink-dark-muted">
              &#9654; No items in this source yet
            </div>
          )}

          {filtered.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((it) => (
                <SourceCard key={it.id} item={it} />
              ))}
            </div>
          )}

          {data && (
            <div className="mt-16 text-center font-mono text-label-sm uppercase tracking-widest text-ink-dark-muted">
              &#9654; {filtered.length} of {data.total} items &mdash; cached {Math.floor(data.ageMs / 1000)}s ago
            </div>
          )}
      </div>
    </main>
  );
}
