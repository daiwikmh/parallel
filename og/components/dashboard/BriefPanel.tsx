"use client";
import { useCallback, useEffect, useState } from "react";
import { fetchBriefs, fetchDigest, fetchSevenDayBrief, type Brief, type DigestPayload, type SevenDayBrief } from "@/lib/api";

interface Props {
  commissionId: string | null;
}

function relativeTime(ms: number): string {
  const now = Date.now();
  const delta = Math.max(0, now - ms);
  const s = Math.floor(delta / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function renderInlineMd(s: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
  const boldRe = /\*\*([^*]+)\*\*/g;
  while (i < s.length) {
    linkRe.lastIndex = i;
    boldRe.lastIndex = i;
    const linkMatch = linkRe.exec(s);
    const boldMatch = boldRe.exec(s);
    const next = [linkMatch, boldMatch]
      .filter((m): m is RegExpExecArray => m !== null)
      .sort((a, b) => a.index - b.index)[0];
    if (!next) {
      parts.push(<span key={key++}>{s.slice(i)}</span>);
      break;
    }
    if (next.index > i) parts.push(<span key={key++}>{s.slice(i, next.index)}</span>);
    if (next === linkMatch && linkMatch) {
      parts.push(
        <a
          key={key++}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-lime hover:underline"
        >
          {linkMatch[1]}
        </a>,
      );
      i = next.index + next[0].length;
    } else if (boldMatch) {
      parts.push(
        <strong key={key++} className="text-ink-light">
          {boldMatch[1]}
        </strong>,
      );
      i = next.index + next[0].length;
    } else {
      i = next.index + 1;
    }
  }
  return parts;
}

function BriefBody({ md }: { md: string }) {
  return (
    <div className="space-y-2 text-ink-light-muted">
      {md.split(/\n+/).map((line, i) => (
        <p key={i} className="leading-relaxed">
          {renderInlineMd(line)}
        </p>
      ))}
    </div>
  );
}

export function BriefPanel({ commissionId }: Props) {
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [digest, setDigest] = useState<DigestPayload | null>(null);
  const [showDigest, setShowDigest] = useState(false);
  const [weekly, setWeekly] = useState<SevenDayBrief | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [showWeekly, setShowWeekly] = useState(false);

  const load = useCallback(async () => {
    if (!commissionId) {
      setBriefs([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { briefs: list } = await fetchBriefs(commissionId, 20);
      setBriefs(list);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [commissionId]);

  useEffect(() => {
    load();
    if (!commissionId) return;
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, [commissionId, load]);

  const loadDigest = useCallback(async () => {
    if (!commissionId) return;
    try {
      const d = await fetchDigest(commissionId);
      setDigest(d);
      setShowDigest(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [commissionId]);

  const copyDigest = useCallback(async () => {
    if (!digest) return;
    try {
      await navigator.clipboard.writeText(digest.markdown);
    } catch {
      /* ignore */
    }
  }, [digest]);

  const loadWeekly = useCallback(async () => {
    if (!commissionId || weeklyLoading) return;
    setWeeklyLoading(true);
    setError(null);
    try {
      const w = await fetchSevenDayBrief(commissionId);
      setWeekly(w);
      setShowWeekly(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWeeklyLoading(false);
    }
  }, [commissionId, weeklyLoading]);

  const toggleExpanded = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!commissionId) return null;

  return (
    <div className="border border-ink-light/10 bg-bg-dark-2/30">
      <div className="flex items-center justify-between px-4 py-3 border-b border-ink-light/10 font-mono text-label-sm uppercase tracking-widest">
        <span className="text-ink-light-muted">▶ BRIEFS</span>
        <div className="flex items-center gap-3 text-ink-light-muted normal-case tracking-normal">
          <span>{briefs.length} total</span>
          <button
            onClick={loadDigest}
            className="px-2 py-0.5 border border-ink-light/15 hover:border-accent-lime/60 hover:text-accent-lime uppercase tracking-widest transition-colors"
            title="Generate 24h digest"
          >
            digest 24h
          </button>
          <button
            onClick={loadWeekly}
            disabled={weeklyLoading}
            className="px-2 py-0.5 border border-accent-lime/40 text-accent-lime hover:border-accent-lime hover:bg-accent-lime/10 uppercase tracking-widest transition-colors disabled:opacity-40"
            title="LLM-summarized 7-day briefing"
          >
            {weeklyLoading ? "…" : "7d brief"}
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="px-2 py-0.5 border border-ink-light/15 hover:border-accent-lime/60 hover:text-accent-lime uppercase tracking-widest transition-colors disabled:opacity-40"
          >
            {loading ? "..." : "refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 border-b border-accent-orange/40 bg-accent-orange/10 font-mono text-label-sm text-accent-orange">
          ▶ {error}
        </div>
      )}

      {showWeekly && weekly && (
        <div className="px-4 py-3 border-b border-accent-lime/40 bg-accent-lime/5 font-mono text-label-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-accent-lime uppercase tracking-widest">
              ▶ 7-day brief · {weekly.brief_count} sources · {weekly.new_entities ?? 0} entities
            </span>
            <button
              onClick={() => setShowWeekly(false)}
              className="px-2 py-0.5 border border-ink-light/15 hover:border-ink-light hover:text-ink-light uppercase tracking-widest transition-colors"
            >
              close
            </button>
          </div>
          <p className="text-ink-light leading-relaxed">{weekly.summary}</p>
          {weekly.trace_id && (
            <div className="mt-2 text-ink-light-muted text-[10px] uppercase tracking-widest">
              trace: {weekly.trace_id.slice(0, 16)}…
            </div>
          )}
        </div>
      )}

      {showDigest && digest && (
        <div className="px-4 py-3 border-b border-ink-light/10 bg-bg-dark-2/60 font-mono text-label-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-ink-light-muted uppercase tracking-widest">
              ▶ digest · {digest.brief_count} briefs · {digest.new_entities.length} entities · {digest.new_edges_count} edges
            </span>
            <div className="flex gap-2">
              <button
                onClick={copyDigest}
                className="px-2 py-0.5 border border-ink-light/15 hover:border-accent-lime/60 hover:text-accent-lime uppercase tracking-widest transition-colors"
              >
                copy md
              </button>
              <button
                onClick={() => setShowDigest(false)}
                className="px-2 py-0.5 border border-ink-light/15 hover:border-ink-light hover:text-ink-light uppercase tracking-widest transition-colors"
              >
                close
              </button>
            </div>
          </div>
          <pre className="text-ink-light-muted whitespace-pre-wrap text-xs max-h-64 overflow-auto">{digest.markdown}</pre>
        </div>
      )}

      {briefs.length === 0 ? (
        <div className="px-4 py-8 text-center font-mono text-label-sm text-ink-light-muted">
          {loading ? "▶ loading..." : "▶ no briefs yet — RUN NOW to generate"}
        </div>
      ) : (
        <div className="divide-y divide-ink-light/5">
          {briefs.map((b) => {
            const expanded = expandedIds.has(b.id);
            const preview = b.body_md.split("\n").slice(0, 3).join(" ").slice(0, 200);
            return (
              <div key={b.id} className="px-4 py-3 hover:bg-bg-dark-2/40 transition-colors">
                <button
                  onClick={() => toggleExpanded(b.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between mb-1 font-mono text-label-sm uppercase tracking-widest text-ink-light-muted">
                    <span>{relativeTime(b.created_at)}</span>
                    <span>{expanded ? "−" : "+"}</span>
                  </div>
                  {expanded ? (
                    <BriefBody md={b.body_md} />
                  ) : (
                    <div className="text-ink-light-muted text-sm truncate">{preview}…</div>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
