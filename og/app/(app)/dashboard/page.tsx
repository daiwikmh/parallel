"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchNews, type NewsResponse } from "@/lib/api";
import { AgentRunCard } from "@/components/agent/AgentRunCard";

export default function DashboardPage() {
  const [data, setData] = useState<NewsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetchNews({ limit: 5 });
        if (!cancelled) setData(r);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    };
    load();
    const id = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const top = data?.items[0];
  const okCount = data?.providers.filter((p) => p.ok).length ?? 0;
  const totalProviders = data?.providers.length ?? 0;

  return (
    <main className="min-h-screen bg-bg-dark text-ink-light">
      <div className="pt-8 pb-24 px-6 md:px-8 max-w-6xl">
        <div className="mb-2">
          <span className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted">
            ▶ OVERVIEW
          </span>
        </div>
        <h1 className="font-display font-bold text-h1 mb-12">Dashboard</h1>

        {error && (
          <div className="border border-accent-orange/60 bg-accent-orange/10 px-4 py-3 mb-8 font-mono text-sm">
            ▶ Backend not reachable: {error}
          </div>
        )}

        <AgentRunCard />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16">
          <div className="lg:col-span-2 border border-ink-light/10 p-6">
            <div className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted mb-4">
              ▶ TOP STORY RIGHT NOW
            </div>
            {top ? (
              <a href={top.url} target="_blank" rel="noopener noreferrer" className="group block">
                <div className="font-mono text-label-sm text-accent-lime uppercase tracking-widest mb-3">
                  {top.source.name} · score {(top.score ?? 0).toFixed(2)}
                </div>
                <h2 className="font-display text-h2 font-bold leading-tight group-hover:text-accent-lime transition-colors">
                  {top.title}
                </h2>
                <p className="mt-3 text-ink-light-muted text-sm line-clamp-3">{top.summary}</p>
              </a>
            ) : (
              <div className="text-ink-light-muted font-mono text-sm">▶ Loading agent inbox...</div>
            )}
          </div>

          <div className="border border-ink-light/10 p-6">
            <div className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted mb-4">
              ▶ WORKER STATUS
            </div>
            <div className="font-display text-display-2 font-bold text-accent-lime leading-none">
              {okCount}/{totalProviders || "·"}
            </div>
            <div className="text-ink-light-muted text-sm mt-2">providers live</div>
            <div className="mt-6 font-mono text-label-sm uppercase tracking-widest text-ink-light-muted">
              {data ? `${data.total} items in cache · ${Math.floor(data.ageMs / 1000)}s ago` : "—"}
            </div>
            <Link
              href="/sources"
              className="block mt-6 font-mono text-label-sm uppercase tracking-widest text-accent-lime hover:text-accent-lime-bright transition-colors"
            >
              ▶ View full inbox ↗
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-16">
          {(data?.providers ?? []).map((p) => (
            <div
              key={p.provider}
              className={`border px-4 py-3 font-mono text-label-sm ${
                p.ok ? "border-ink-light/10" : "border-accent-orange/60"
              }`}
            >
              <div className="uppercase tracking-widest text-ink-light-muted truncate">{p.provider}</div>
              <div className="text-ink-light mt-1">{p.ok ? `${p.count} items` : "error"}</div>
            </div>
          ))}
          {!data && <div className="text-ink-light-muted font-mono text-sm col-span-full">▶ Loading providers...</div>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/sources" className="border border-ink-light/10 p-6 hover:border-accent-lime/60 transition-colors">
            <div className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted">▶ SOURCES</div>
            <div className="font-display text-h3 font-bold mt-2">Agent inbox</div>
            <div className="text-ink-light-muted text-sm mt-2">Live feed of what the agent is reading.</div>
          </Link>
          <Link href="/agent" className="border border-ink-light/10 p-6 hover:border-accent-lime/60 transition-colors">
            <div className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted">▶ AGENT</div>
            <div className="font-display text-h3 font-bold mt-2">Transparency</div>
            <div className="text-ink-light-muted text-sm mt-2">Module health, activity log, INFT profile.</div>
          </Link>
          <Link href="/graph" className="border border-ink-light/10 p-6 hover:border-accent-lime/60 transition-colors">
            <div className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted">▶ GRAPH</div>
            <div className="font-display text-h3 font-bold mt-2">Knowledge graph</div>
            <div className="text-ink-light-muted text-sm mt-2">Entities the agent has connected.</div>
          </Link>
        </div>
      </div>
    </main>
  );
}
