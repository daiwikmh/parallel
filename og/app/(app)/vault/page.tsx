"use client";
import { useEffect, useState } from "react";
import { fetchVault, listCommissions, type VaultPayload, type Commission } from "@/lib/api";

type Tab = "briefs" | "uploads";

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function fmtTs(ts: number): string {
  return new Date(ts).toISOString().replace("T", " ").replace("Z", "").slice(0, 16);
}

function isAnchored(h: string | null | undefined): boolean {
  return typeof h === "string" && h.startsWith("0g:");
}

function hashColor(h: string | null | undefined): string {
  if (!h) return "text-ink-light-muted";
  if (h.startsWith("0g:")) return "text-accent-lime";
  if (h.startsWith("local:")) return "text-ink-light";
  return "text-ink-light-muted";
}

function hashShort(h: string | null | undefined): string {
  if (!h) return "—";
  if (h.length <= 20) return h;
  const [scheme, rest] = h.split(":");
  if (!rest) return h.slice(0, 20) + "…";
  return `${scheme}:${rest.slice(0, 8)}…${rest.slice(-6)}`;
}

function StatTile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="border border-ink-light/10 bg-bg-dark-2/30 px-4 py-3">
      <div className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted">{label}</div>
      <div className="font-display font-bold text-2xl text-ink-light mt-1 truncate">{value}</div>
      {hint && (
        <div className="font-mono text-[10px] uppercase tracking-widest text-ink-light-muted mt-1">{hint}</div>
      )}
    </div>
  );
}

export default function VaultPage() {
  const [data, setData] = useState<VaultPayload | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [tab, setTab] = useState<Tab>("briefs");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    listCommissions().then((r) => setCommissions(r.commissions)).catch(() => undefined);
  }, []);

  useEffect(() => {
    setError(null);
    fetchVault(filter || undefined)
      .then((d) => setData(d))
      .catch((e) => setError((e as Error).message));
  }, [filter]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied((v) => (v === text ? null : v)), 1500);
    } catch {
      /* noop */
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <div className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted">▶ VAULT</div>
          <h1 className="font-display font-bold text-h2 text-ink-light">Anchored artifacts</h1>
          <p className="font-mono text-label-sm text-ink-light-muted mt-1 max-w-2xl">
            Every brief and uploaded dataset, with its content hash. Hashes prefixed{" "}
            <span className="text-accent-lime">0g:</span> are anchored on 0G Storage and verifiable by root hash;{" "}
            <span className="text-ink-light">local:</span> are content-addressed but not yet uploaded.
          </p>
        </div>
        <div className="font-mono text-label-sm">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-bg-dark border border-ink-light/10 px-2 py-1 text-ink-light focus:border-accent-lime/50 focus:outline-none"
          >
            <option value="">all commissions</option>
            {commissions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.query_text}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="border border-accent-orange/60 bg-accent-orange/10 px-3 py-2 font-mono text-label-sm text-accent-orange">
          ▶ {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatTile
          label="Briefs anchored"
          value={data ? `${data.stats.briefs_anchored} / ${data.stats.briefs_total}` : "—"}
          hint="on 0G Storage"
        />
        <StatTile
          label="Uploads anchored"
          value={data ? `${data.stats.uploads_anchored} / ${data.stats.uploads_total}` : "—"}
          hint="on 0G Storage"
        />
        <StatTile
          label="Total upload bytes"
          value={data ? fmtBytes(data.stats.bytes_total) : "—"}
          hint="sha-256 anchored"
        />
        <StatTile
          label="Storage flag"
          value={data?.flags.OG_STORAGE_ENABLED ? "ON" : "OFF"}
          hint={data?.flags.OG_STORAGE_ENABLED ? "real uploads" : "local hashes only"}
        />
      </div>

      <div className="flex gap-1">
        {(["briefs", "uploads"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 font-mono text-label-sm uppercase tracking-widest border ${
              tab === t
                ? "border-accent-lime text-accent-lime"
                : "border-ink-light/10 text-ink-light-muted hover:text-ink-light"
            } transition-colors`}
          >
            {t} {data ? `(${t === "briefs" ? data.briefs.length : data.uploads.length})` : ""}
          </button>
        ))}
      </div>

      <div className="border border-ink-light/10 bg-bg-dark-2/30">
        {tab === "briefs" ? (
          <BriefsTable data={data} onCopy={copy} copied={copied} />
        ) : (
          <UploadsTable data={data} onCopy={copy} copied={copied} />
        )}
      </div>
    </div>
  );
}

function BriefsTable({
  data,
  onCopy,
  copied,
}: {
  data: VaultPayload | null;
  onCopy: (s: string) => void;
  copied: string | null;
}) {
  if (!data) return <div className="p-4 font-mono text-label-sm text-ink-light-muted">▶ loading…</div>;
  if (data.briefs.length === 0) {
    return (
      <div className="p-4 font-mono text-label-sm text-ink-light-muted">
        No anchored briefs yet. Run a commission to produce one — each successful run writes the brief snapshot to the vault.
      </div>
    );
  }
  return (
    <table className="w-full font-mono text-label-sm">
      <thead className="bg-bg-dark/40 text-ink-light-muted">
        <tr className="text-left uppercase tracking-widest text-[10px]">
          <th className="px-3 py-2">when</th>
          <th className="px-3 py-2">commission</th>
          <th className="px-3 py-2">excerpt</th>
          <th className="px-3 py-2">hash</th>
          <th className="px-3 py-2">trace</th>
        </tr>
      </thead>
      <tbody>
        {data.briefs.map((b) => (
          <tr key={b.id} className="border-t border-ink-light/10 align-top">
            <td className="px-3 py-2 text-ink-light-muted whitespace-nowrap">{fmtTs(b.created_at)}</td>
            <td className="px-3 py-2 text-ink-light max-w-[12rem] truncate">{b.commission_query}</td>
            <td className="px-3 py-2 text-ink-light-muted max-w-[24rem]">
              <span className="line-clamp-2">{b.body_excerpt}…</span>
            </td>
            <td className="px-3 py-2 whitespace-nowrap">
              {b.storage_hash ? (
                <button
                  onClick={() => onCopy(b.storage_hash!)}
                  className={`${hashColor(b.storage_hash)} hover:underline`}
                  title={b.storage_hash}
                >
                  {copied === b.storage_hash ? "copied ✓" : hashShort(b.storage_hash)}
                  {isAnchored(b.storage_hash) && <span className="ml-1 text-[10px]">●</span>}
                </button>
              ) : (
                <span className="text-ink-light-muted">—</span>
              )}
            </td>
            <td className="px-3 py-2 text-ink-light-muted whitespace-nowrap">
              {b.trace_id ? b.trace_id.slice(0, 10) : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function UploadsTable({
  data,
  onCopy,
  copied,
}: {
  data: VaultPayload | null;
  onCopy: (s: string) => void;
  copied: string | null;
}) {
  if (!data) return <div className="p-4 font-mono text-label-sm text-ink-light-muted">▶ loading…</div>;
  if (data.uploads.length === 0) {
    return (
      <div className="p-4 font-mono text-label-sm text-ink-light-muted">
        No uploads yet. Drop a CSV from the dashboard&rsquo;s Upload Dataset panel to anchor it.
      </div>
    );
  }
  return (
    <table className="w-full font-mono text-label-sm">
      <thead className="bg-bg-dark/40 text-ink-light-muted">
        <tr className="text-left uppercase tracking-widest text-[10px]">
          <th className="px-3 py-2">when</th>
          <th className="px-3 py-2">commission</th>
          <th className="px-3 py-2">file</th>
          <th className="px-3 py-2">rows</th>
          <th className="px-3 py-2">size</th>
          <th className="px-3 py-2">status</th>
          <th className="px-3 py-2">storage uri</th>
          <th className="px-3 py-2">sha-256</th>
        </tr>
      </thead>
      <tbody>
        {data.uploads.map((u) => (
          <tr key={u.id} className="border-t border-ink-light/10 align-top">
            <td className="px-3 py-2 text-ink-light-muted whitespace-nowrap">{fmtTs(u.created_at)}</td>
            <td className="px-3 py-2 text-ink-light max-w-[10rem] truncate">{u.commission_query}</td>
            <td className="px-3 py-2 text-ink-light max-w-[14rem] truncate">{u.filename}</td>
            <td className="px-3 py-2 text-ink-light-muted whitespace-nowrap">
              {u.rows_processed}/{u.rows_total} ·{" "}
              <span className="text-ink-light">{u.entities_added}E {u.edges_added}rel</span>
            </td>
            <td className="px-3 py-2 text-ink-light-muted whitespace-nowrap">{fmtBytes(u.size)}</td>
            <td
              className={`px-3 py-2 whitespace-nowrap uppercase tracking-widest text-[10px] ${
                u.status === "completed"
                  ? "text-accent-lime"
                  : u.status === "partial"
                  ? "text-accent-yellow"
                  : u.status === "failed"
                  ? "text-accent-orange"
                  : "text-ink-light-muted"
              }`}
            >
              {u.status}
            </td>
            <td className="px-3 py-2 whitespace-nowrap">
              {u.storage_uri ? (
                <button
                  onClick={() => onCopy(u.storage_uri!)}
                  className={`${hashColor(u.storage_uri)} hover:underline`}
                  title={u.storage_uri}
                >
                  {copied === u.storage_uri ? "copied ✓" : hashShort(u.storage_uri)}
                  {isAnchored(u.storage_uri) && <span className="ml-1 text-[10px]">●</span>}
                </button>
              ) : (
                <span className="text-ink-light-muted">—</span>
              )}
            </td>
            <td className="px-3 py-2 whitespace-nowrap">
              <button
                onClick={() => onCopy(u.content_sha256)}
                className="text-ink-light-muted hover:text-ink-light hover:underline"
                title={u.content_sha256}
              >
                {copied === u.content_sha256 ? "copied ✓" : `${u.content_sha256.slice(0, 8)}…${u.content_sha256.slice(-4)}`}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
