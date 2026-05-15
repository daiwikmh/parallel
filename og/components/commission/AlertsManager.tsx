"use client";
import { useCallback, useEffect, useState } from "react";
import {
  listAlertRules,
  createAlertRule,
  patchAlertRule,
  deleteAlertRule,
  listAlertEvents,
  type AlertRule,
  type AlertEvent,
  type AlertKind,
} from "@/lib/api";

interface Props {
  commissionId: string | null;
}

interface Draft {
  kind: AlertKind;
  entity_id: string;
  edge_types: string;
  keywords: string;
  threshold: string;
  webhook_url: string;
}

const EMPTY_DRAFT: Draft = {
  kind: "entity_mentioned",
  entity_id: "",
  edge_types: "exploited,regulates",
  keywords: "",
  threshold: "0.35",
  webhook_url: "",
};

const KIND_LABELS: Record<AlertKind, string> = {
  entity_mentioned: "Entity mentioned",
  edge_type_added: "Edge type added",
  keyword_in_evidence: "Keyword in evidence",
  sentiment_drop: "Sentiment drops below threshold",
};

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

function describeRule(rule: AlertRule): string {
  let cfg: Record<string, unknown> = {};
  try { cfg = JSON.parse(rule.config) as Record<string, unknown>; } catch { /* ignore */ }
  switch (rule.kind) {
    case "entity_mentioned": return `entity = ${String(cfg.entity_id ?? "?")}`;
    case "edge_type_added": return `edge ∈ {${(cfg.edge_types as string[] ?? []).join(", ")}}`;
    case "keyword_in_evidence": return `keyword ∈ {${(cfg.keywords as string[] ?? []).join(", ")}}`;
    case "sentiment_drop": return `${cfg.entity_id ?? "?"} below ${cfg.threshold ?? "?"}`;
  }
}

export function AlertsManager({ commissionId }: Props) {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!commissionId) {
      setRules([]);
      setEvents([]);
      return;
    }
    try {
      const [r, e] = await Promise.all([
        listAlertRules(commissionId),
        listAlertEvents(commissionId, 20),
      ]);
      setRules(r.rules);
      setEvents(e.events);
    } catch (e) {
      setErr((e as Error).message);
    }
  }, [commissionId]);

  useEffect(() => {
    load();
    if (!commissionId) return;
    const id = setInterval(load, 20_000);
    return () => clearInterval(id);
  }, [commissionId, load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commissionId || busy) return;
    let config: Record<string, unknown> = {};
    if (draft.kind === "entity_mentioned") {
      if (!draft.entity_id.trim()) { setErr("entity_id required"); return; }
      config = { entity_id: draft.entity_id.trim() };
    } else if (draft.kind === "edge_type_added") {
      const types = draft.edge_types.split(",").map((s) => s.trim()).filter(Boolean);
      if (!types.length) { setErr("at least one edge type"); return; }
      config = { edge_types: types };
    } else if (draft.kind === "keyword_in_evidence") {
      const kws = draft.keywords.split(",").map((s) => s.trim()).filter(Boolean);
      if (!kws.length) { setErr("at least one keyword"); return; }
      config = { keywords: kws };
    } else if (draft.kind === "sentiment_drop") {
      if (!draft.entity_id.trim()) { setErr("entity_id required"); return; }
      const t = Number(draft.threshold);
      if (!Number.isFinite(t) || t < 0 || t > 1) { setErr("threshold must be 0.0–1.0"); return; }
      config = { entity_id: draft.entity_id.trim(), threshold: t };
    }
    if (draft.webhook_url.trim()) config.webhook_url = draft.webhook_url.trim();
    setBusy(true);
    setErr(null);
    try {
      await createAlertRule(commissionId, draft.kind, config);
      setDraft(EMPTY_DRAFT);
      setShowForm(false);
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleToggle = async (rule: AlertRule) => {
    if (!commissionId) return;
    try {
      await patchAlertRule(commissionId, rule.id, { active: rule.active ? 0 : 1 });
      await load();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!commissionId) return;
    try {
      await deleteAlertRule(commissionId, id);
      await load();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  if (!commissionId) return null;

  return (
    <div className="border border-ink-light/10 bg-bg-dark-2/30">
      <div className="px-4 py-3 border-b border-ink-light/10 font-mono text-label-sm uppercase tracking-widest flex items-center justify-between text-ink-light-muted">
        <span>▶ ALERTS</span>
        <div className="flex items-center gap-3 normal-case tracking-normal">
          <span>{rules.filter(r => r.active).length}/{rules.length} active</span>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="px-2 py-0.5 border border-ink-light/15 hover:border-accent-lime/60 hover:text-accent-lime uppercase tracking-widest transition-colors"
          >
            {showForm ? "−" : "+ new"}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="px-4 py-3 border-b border-ink-light/10 space-y-2 font-mono text-label-sm">
          <select
            value={draft.kind}
            onChange={(e) => setDraft({ ...draft, kind: e.target.value as AlertKind })}
            className="w-full bg-bg-dark-2 border border-ink-light/10 px-2 py-1 text-ink-light"
          >
            {(Object.keys(KIND_LABELS) as AlertKind[]).map((k) => (
              <option key={k} value={k}>{KIND_LABELS[k]}</option>
            ))}
          </select>
          {draft.kind === "entity_mentioned" && (
            <input
              type="text"
              value={draft.entity_id}
              onChange={(e) => setDraft({ ...draft, entity_id: e.target.value })}
              placeholder="entity canonical id (e.g. token:bitcoin)"
              className="w-full bg-bg-dark-2 border border-ink-light/10 px-2 py-1 text-ink-light placeholder:text-ink-light-muted/50"
            />
          )}
          {draft.kind === "edge_type_added" && (
            <input
              type="text"
              value={draft.edge_types}
              onChange={(e) => setDraft({ ...draft, edge_types: e.target.value })}
              placeholder="edge types comma-separated (exploited, regulates)"
              className="w-full bg-bg-dark-2 border border-ink-light/10 px-2 py-1 text-ink-light placeholder:text-ink-light-muted/50"
            />
          )}
          {draft.kind === "keyword_in_evidence" && (
            <input
              type="text"
              value={draft.keywords}
              onChange={(e) => setDraft({ ...draft, keywords: e.target.value })}
              placeholder="keywords comma-separated (hack, lawsuit)"
              className="w-full bg-bg-dark-2 border border-ink-light/10 px-2 py-1 text-ink-light placeholder:text-ink-light-muted/50"
            />
          )}
          {draft.kind === "sentiment_drop" && (
            <>
              <input
                type="text"
                value={draft.entity_id}
                onChange={(e) => setDraft({ ...draft, entity_id: e.target.value })}
                placeholder="entity canonical id"
                className="w-full bg-bg-dark-2 border border-ink-light/10 px-2 py-1 text-ink-light placeholder:text-ink-light-muted/50"
              />
              <input
                type="text"
                value={draft.threshold}
                onChange={(e) => setDraft({ ...draft, threshold: e.target.value })}
                placeholder="threshold 0.0 to 1.0 (0.35 default)"
                className="w-full bg-bg-dark-2 border border-ink-light/10 px-2 py-1 text-ink-light placeholder:text-ink-light-muted/50"
              />
            </>
          )}
          <input
            type="text"
            value={draft.webhook_url}
            onChange={(e) => setDraft({ ...draft, webhook_url: e.target.value })}
            placeholder="optional webhook URL (test with webhook.site)"
            className="w-full bg-bg-dark-2 border border-ink-light/10 px-2 py-1 text-ink-light placeholder:text-ink-light-muted/50"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 px-2 py-1 bg-accent-lime text-bg-dark uppercase tracking-widest hover:bg-accent-lime-bright disabled:opacity-40 transition-colors"
            >
              {busy ? "…" : "create"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setDraft(EMPTY_DRAFT); }}
              className="px-3 py-1 border border-ink-light/15 hover:border-ink-light hover:text-ink-light uppercase tracking-widest transition-colors"
            >
              cancel
            </button>
          </div>
          {err && <div className="text-accent-orange">▶ {err}</div>}
        </form>
      )}

      {rules.length === 0 ? (
        <div className="px-4 py-6 text-center font-mono text-label-sm text-ink-light-muted">
          ▶ no alerts. + new to create one
        </div>
      ) : (
        <div className="divide-y divide-ink-light/5 font-mono text-label-sm">
          {rules.map((r) => (
            <div key={r.id} className="px-4 py-2">
              <div className="flex items-center gap-3">
                <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${r.active ? "bg-accent-lime" : "bg-ink-light-muted"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-ink-light truncate">{KIND_LABELS[r.kind]}</div>
                  <div className="text-ink-light-muted text-[10px] uppercase tracking-widest truncate">
                    {describeRule(r)} · last {relTime(r.last_fired_at)}
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(r)}
                  className={`px-1 ${r.active ? "text-accent-lime" : "text-ink-light-muted hover:text-ink-light"}`}
                  title={r.active ? "pause" : "resume"}
                >
                  {r.active ? "◐" : "○"}
                </button>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="px-1 text-ink-light-muted hover:text-accent-orange"
                  title="delete"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {events.length > 0 && (
        <div className="border-t border-ink-light/10">
          <div className="px-4 py-2 font-mono text-label-sm uppercase tracking-widest text-ink-light-muted">
            ▶ recent fires
          </div>
          <div className="divide-y divide-ink-light/5 font-mono text-label-sm max-h-48 overflow-y-auto">
            {events.map((ev) => {
              let p: { message?: string; article_title?: string } = {};
              try { p = JSON.parse(ev.payload) as typeof p; } catch { /* ignore */ }
              return (
                <div key={ev.id} className="px-4 py-2">
                  <div className="text-ink-light truncate">{p.message ?? "(no message)"}</div>
                  <div className="text-ink-light-muted text-[10px] uppercase tracking-widest truncate">
                    {ev.kind ?? "?"} · {relTime(ev.created_at)} · {ev.delivered_to}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
