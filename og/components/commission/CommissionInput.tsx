"use client";
import { useState } from "react";
import { createCommission, type Classification, type Commission } from "@/lib/api";

interface Props {
  onCreated: (commission: Commission, classification: Classification) => void;
  compact?: boolean;
}

const EXAMPLES = ["Bitcoin", "Vitalik", "Uniswap", "EU MiCA", "L2 fee compression"];

export function CommissionInput({ onCreated, compact = false }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q || loading) return;
    setError(null);
    setLoading(true);
    try {
      const { commission, classification } = await createCommission(q);
      onCreated(commission, classification);
      setQuery("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={compact ? "" : "mb-12"}>
      {!compact && (
        <div className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted mb-3">
          ▶ COMMISSION A TOPIC
        </div>
      )}
      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type any token, person, protocol, regulation..."
          disabled={loading}
          className="flex-1 bg-bg-dark-2 border border-ink-light/10 px-4 py-3 font-mono text-sm text-ink-light placeholder:text-ink-light-muted focus:outline-none focus:border-accent-lime/60 transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-6 py-3 bg-accent-lime text-bg-dark font-mono text-label-sm uppercase tracking-widest hover:bg-accent-lime-bright disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "▶ CLASSIFYING…" : "START ▸"}
        </button>
      </form>
      {!compact && (
        <div className="mt-3 font-mono text-label-sm text-ink-light-muted">
          examples:{" "}
          {EXAMPLES.map((ex, i) => (
            <button
              key={ex}
              onClick={() => setQuery(ex)}
              className="hover:text-accent-lime transition-colors"
            >
              {ex}
              {i < EXAMPLES.length - 1 && <span className="text-ink-light/30"> · </span>}
            </button>
          ))}
        </div>
      )}
      {error && (
        <div className="mt-3 border border-accent-orange/60 bg-accent-orange/10 px-4 py-2 font-mono text-label-sm text-accent-orange">
          ▶ {error}
        </div>
      )}
    </div>
  );
}
