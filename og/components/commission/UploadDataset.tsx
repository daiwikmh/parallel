"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  listUploads,
  getUpload,
  uploadCsv,
  type UploadRow,
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

function statusLabel(s: UploadRow["status"]): { text: string; color: string } {
  switch (s) {
    case "completed":
      return { text: "DONE", color: "text-accent-lime" };
    case "processing":
    case "pending":
      return { text: "PROCESSING", color: "text-accent-blue" };
    case "partial":
      return { text: "PARTIAL", color: "text-accent-yellow" };
    case "failed":
      return { text: "FAILED", color: "text-accent-orange" };
    default:
      return { text: s.toUpperCase(), color: "text-ink-light-muted" };
  }
}

export function UploadDataset({ commissionId }: Props) {
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!commissionId) {
      setUploads([]);
      return;
    }
    try {
      const { uploads: list } = await listUploads(commissionId);
      setUploads(list);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [commissionId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!commissionId || !activeId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const { upload } = await getUpload(commissionId, activeId);
        if (cancelled) return;
        setUploads((prev) => {
          const idx = prev.findIndex((u) => u.id === upload.id);
          if (idx < 0) return [upload, ...prev];
          const next = prev.slice();
          next[idx] = upload;
          return next;
        });
        if (upload.status === "completed" || upload.status === "partial" || upload.status === "failed") {
          setActiveId(null);
        }
      } catch (e) {
        if (cancelled) return;
        setError((e as Error).message);
        setActiveId(null);
      }
    };
    const handle = setInterval(tick, 1500);
    void tick();
    return () => {
      cancelled = true;
      clearInterval(handle);
    };
  }, [commissionId, activeId]);

  const handleFile = async (file: File) => {
    if (!commissionId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await uploadCsv(commissionId, file);
      setActiveId(res.upload_id);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  if (!commissionId) return null;

  const active = activeId ? uploads.find((u) => u.id === activeId) : null;
  const recent = uploads.filter((u) => u.id !== activeId).slice(0, 5);

  return (
    <div className="border border-ink-light/10 bg-bg-dark-2/30">
      <div className="px-4 py-3 border-b border-ink-light/10 font-mono text-label-sm uppercase tracking-widest text-ink-light-muted flex items-center justify-between">
        <span>▶ UPLOAD DATASET</span>
        <span className="normal-case tracking-normal">CSV · max 1MB · 20 rows</span>
      </div>

      <div className="px-4 py-3 border-b border-ink-light/10 font-mono text-label-sm">
        <div className="flex gap-2 items-center">
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
            disabled={busy}
            className="flex-1 text-ink-light file:mr-2 file:px-3 file:py-1 file:bg-accent-lime file:text-bg-dark file:uppercase file:tracking-widest file:border-0 file:cursor-pointer"
          />
        </div>
        {error && <div className="text-accent-orange mt-2">▶ {error}</div>}
      </div>

      {active && (
        <div className="px-4 py-3 border-b border-ink-light/10 font-mono text-label-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-ink-light truncate">{active.filename}</span>
            <span className={statusLabel(active.status).color}>
              {statusLabel(active.status).text}
            </span>
          </div>
          <div className="h-1 bg-bg-dark-2 overflow-hidden">
            <div
              className="h-full bg-accent-lime transition-all"
              style={{
                width: `${active.rows_total ? Math.round((active.rows_processed / active.rows_total) * 100) : 0}%`,
              }}
            />
          </div>
          <div className="text-ink-light-muted text-[10px] uppercase tracking-widest mt-1">
            {active.rows_processed}/{active.rows_total} rows · {active.entities_added} entities · {active.edges_added} edges · hash {(active.storage_uri ?? "").slice(0, 24)}
          </div>
        </div>
      )}

      {recent.length === 0 && !active ? (
        <div className="px-4 py-6 text-center font-mono text-label-sm text-ink-light-muted">
          ▶ drop a CSV to extend your commission&apos;s graph
        </div>
      ) : (
        <div className="divide-y divide-ink-light/5 font-mono text-label-sm">
          {recent.map((u) => {
            const s = statusLabel(u.status);
            return (
              <div key={u.id} className="px-4 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ink-light truncate flex-1">{u.filename}</span>
                  <span className={`text-[10px] uppercase tracking-widest ${s.color}`}>{s.text}</span>
                </div>
                <div className="text-ink-light-muted text-[10px] uppercase tracking-widest">
                  {relTime(u.created_at)} · {u.rows_processed}/{u.rows_total} rows · {u.entities_added}E/{u.edges_added}e · hash {(u.storage_uri ?? "").slice(0, 24)}
                  {u.error ? ` · ${u.error.slice(0, 60)}` : ""}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
