"use client";
import { useCallback, useEffect, useState } from "react";
import {
  getTelegramChannel,
  saveTelegramChannel,
  testTelegramChannel,
  deleteTelegramChannel,
  type TelegramChannel,
} from "@/lib/api";

export function TelegramSection() {
  const [chatId, setChatId] = useState("");
  const [saved, setSaved] = useState<TelegramChannel | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const { channel } = await getTelegramChannel();
      setSaved(channel);
      if (channel) setChatId(channel.target);
    } catch {
      /* ignore — backend may not be running */
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const handleSave = async () => {
    if (!chatId.trim() || busy) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const { channel } = await saveTelegramChannel(chatId.trim());
      setSaved(channel);
      setMsg("saved");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleTest = async () => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const r = await testTelegramChannel();
      if (r.ok) setMsg("test sent — check Telegram");
      else setMsg(r.reason ?? "test failed");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async () => {
    setBusy(true);
    try {
      await deleteTelegramChannel();
      setSaved(null);
      setChatId("");
      setMsg("cleared");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-t border-ink-light/10 px-3 py-3 font-mono text-label-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-ink-light-muted uppercase tracking-widest hover:text-accent-lime transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${saved ? "bg-accent-lime" : "bg-ink-light-muted"}`} />
          Telegram
        </span>
        <span>{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          <div className="text-ink-light-muted text-[10px] uppercase tracking-widest">
            chat id
          </div>
          <input
            type="text"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            placeholder="e.g. 12345678"
            className="w-full bg-bg-dark-2 border border-ink-light/10 px-2 py-1 text-ink-light placeholder:text-ink-light-muted/50"
          />
          <div className="text-ink-light-muted text-[10px]">
            get yours from <span className="text-ink-light">@userinfobot</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={busy || !chatId.trim()}
              className="flex-1 px-2 py-1 bg-accent-lime text-bg-dark uppercase tracking-widest hover:bg-accent-lime-bright disabled:opacity-40 transition-colors"
            >
              save
            </button>
            <button
              onClick={handleTest}
              disabled={busy || !saved}
              className="flex-1 px-2 py-1 border border-ink-light/15 hover:border-accent-lime/60 hover:text-accent-lime uppercase tracking-widest disabled:opacity-40 transition-colors"
            >
              test
            </button>
          </div>
          {saved && (
            <button
              onClick={handleClear}
              disabled={busy}
              className="w-full px-2 py-1 text-ink-light-muted hover:text-accent-orange uppercase tracking-widest text-[10px] border border-ink-light/10 hover:border-accent-orange/40 transition-colors"
            >
              clear
            </button>
          )}
          {msg && <div className="text-accent-lime text-[10px]">▶ {msg}</div>}
          {err && <div className="text-accent-orange text-[10px]">▶ {err}</div>}
        </div>
      )}
    </div>
  );
}
