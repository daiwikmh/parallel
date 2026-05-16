"use client";
import { useCallback, useEffect, useState } from "react";
import { fetchAuditFeed, type AuditFeed, type AuditEvent } from "@/lib/api";

const KIND_COLOR: Record<string, string> = {
  commission_created: "text-accent-lime",
  brief_generated: "text-accent-blue",
  chat_inference: "text-ink-light",
  image_edit_inference: "text-ink-light",
  alert_rule_created: "text-accent-yellow",
  alert_fired: "text-accent-orange",
  source_added: "text-accent-blue",
  channel_added: "text-accent-yellow",
  article_processed: "text-ink-light-muted",
  upload_processed: "text-accent-lime",
};

const KIND_LABEL: Record<string, string> = {
  commission_created: "COMMISSION",
  brief_generated: "BRIEF",
  chat_inference: "0G INFERENCE",
  image_edit_inference: "0G IMAGE",
  alert_rule_created: "ALERT RULE",
  alert_fired: "ALERT FIRED",
  source_added: "SOURCE",
  channel_added: "CHANNEL",
  article_processed: "ARTICLE",
  upload_processed: "UPLOAD",
};

function fmt(ts: number): string {
  return new Date(ts).toISOString().replace("T", " ").replace("Z", "").slice(0, 19);
}

function weiToOg(wei: string): string {
  try {
    const v = BigInt(wei);
    const whole = v / 10n ** 18n;
    const frac = (v % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/, "");
    return frac ? `${whole}.${frac.slice(0, 8)}` : whole.toString();
  } catch {
    return wei;
  }
}

function StatTile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="border border-ink-light/10 bg-bg-dark-2/30 px-4 py-3">
      <div className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted">
        {label}
      </div>
      <div className="font-display font-bold text-2xl text-ink-light mt-1 truncate">
        {value}
      </div>
      {hint && (
        <div className="font-mono text-[10px] uppercase tracking-widest text-ink-light-muted mt-1">
          {hint}
        </div>
      )}
    </div>
  );
}

function FlagPill({ name, on }: { name: string; on: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 border text-[10px] uppercase tracking-widest ${on ? "border-accent-lime/60 text-accent-lime" : "border-ink-light/15 text-ink-light-muted"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${on ? "bg-accent-lime" : "bg-ink-light-muted"}`} />
      {name} {on ? "on" : "off"}
    </span>
  );
}

function AuditRow({ ev }: { ev: AuditEvent }) {
  const color = KIND_COLOR[ev.kind] ?? "text-ink-light-muted";
  const label = KIND_LABEL[ev.kind] ?? ev.kind.toUpperCase();
  return (
    <div className="px-4 py-2 hover:bg-bg-dark-2/40 transition-colors flex gap-3 font-mono text-label-sm">
      <span className="text-ink-light-muted shrink-0 w-44 truncate">{fmt(ev.ts)}</span>
      <span className={`shrink-0 w-32 uppercase tracking-widest ${color}`}>{label}</span>
      <span className="text-ink-light flex-1 truncate" title={ev.summary ?? ""}>
        {ev.summary ?? "(no detail)"}
      </span>
      {ev.trace_id && (
        <span className="text-ink-light-muted text-[10px] uppercase tracking-widest shrink-0" title={`request_id ${ev.trace_id}`}>
          trace {ev.trace_id.slice(0, 8)}…
        </span>
      )}
      {ev.commission_id && (
        <span className="text-ink-light-muted text-[10px] uppercase tracking-widest shrink-0" title={ev.commission_id}>
          {ev.commission_id.slice(0, 14)}…
        </span>
      )}
    </div>
  );
}

export default function AuditPage() {
  const [feed, setFeed] = useState<AuditFeed | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const f = await fetchAuditFeed(200);
      setFeed(f);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, [load]);

  const events = feed?.events ?? [];
  const filteredEvents = filter === "all" ? events : events.filter((e) => e.kind === filter);
  const kinds = Array.from(new Set(events.map((e) => e.kind)));

  return (
    <main className="min-h-screen bg-bg-dark text-ink-light">
      <div className="pt-8 pb-24 px-6 md:px-8 max-w-7xl">
        <div className="mb-2 font-mono text-label-sm uppercase tracking-widest text-ink-light-muted">
          ▶ AUDIT LOG
        </div>
        <h1 className="font-display font-bold text-h1 mb-2">Every action, logged.</h1>
        <p className="text-ink-light-muted mb-8 max-w-2xl">
          Each user action is captured with its timestamp. Inference calls carry a 0G request ID + provider address. No background polling — every entry below is something you, or the agent acting on your click, actually did.
        </p>

        {error && (
          <div className="border border-accent-orange/60 bg-accent-orange/10 px-4 py-3 mb-6 font-mono text-label-sm">
            ▶ {error}
          </div>
        )}

        {feed && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
            <StatTile label="commissions" value={feed.counts.commissions ?? 0} />
            <StatTile label="briefs" value={feed.counts.briefs ?? 0} />
            <StatTile label="0G calls" value={feed.counts.inference_calls ?? 0} hint={`${weiToOg(feed.totals.inference_cost_wei)} OG total`} />
            <StatTile label="alerts fired" value={feed.counts.alerts_fired ?? 0} hint={`${feed.counts.alert_rules ?? 0} rules`} />
            <StatTile label="sources" value={feed.counts.sources ?? 0} />
            <StatTile label="channels" value={feed.counts.channels ?? 0} />
          </div>
        )}

        {feed && (
          <div className="mb-4 flex items-center gap-3 flex-wrap">
            <span className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted">flags:</span>
            <FlagPill name="payment" on={feed.flags.PAYMENT_ENABLED} />
            <FlagPill name="storage" on={feed.flags.OG_STORAGE_ENABLED} />
            <FlagPill name="chain" on={feed.flags.OG_CHAIN_ENABLED} />
            <span className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted ml-4">model:</span>
            <span className={`font-mono text-label-sm ${feed.inference.available ? "text-accent-lime" : "text-accent-orange"}`}>
              {feed.inference.model} {feed.inference.available ? "live" : "offline"}
            </span>
          </div>
        )}

        <div className="border border-ink-light/10 bg-bg-dark-2/30">
          <div className="px-4 py-3 border-b border-ink-light/10 flex items-center justify-between flex-wrap gap-2">
            <span className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted">
              ▶ {filteredEvents.length} events
            </span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-bg-dark-2 border border-ink-light/10 px-2 py-1 font-mono text-label-sm text-ink-light"
            >
              <option value="all">all kinds</option>
              {kinds.map((k) => (
                <option key={k} value={k}>{KIND_LABEL[k] ?? k}</option>
              ))}
            </select>
          </div>
          {filteredEvents.length === 0 ? (
            <div className="px-4 py-12 text-center font-mono text-label-sm text-ink-light-muted">
              ▶ no events yet — start a commission on the dashboard
            </div>
          ) : (
            <div className="divide-y divide-ink-light/5 max-h-[640px] overflow-y-auto">
              {filteredEvents.map((ev) => (
                <AuditRow key={`${ev.kind}-${ev.related_id}-${ev.ts}`} ev={ev} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
