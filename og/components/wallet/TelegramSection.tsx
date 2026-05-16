"use client";
import { useCallback, useEffect, useState } from "react";
import {
  getTelegramChannel,
  saveTelegramChannel,
  testTelegramChannel,
  deleteTelegramChannel,
  listCommissions,
  updateCommissionSubscriptions,
  type TelegramChannel,
  type Commission,
} from "@/lib/api";

export function TelegramSection() {
  const [chatId, setChatId] = useState("");
  const [saved, setSaved] = useState<TelegramChannel | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);
  const [subsOpen, setSubsOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const { channel } = await getTelegramChannel();
      setSaved(channel);
      if (channel) setChatId(channel.target);
    } catch {
      /* ignore — backend may not be running */
    }
    try {
      const r = await listCommissions();
      setCommissions(r.commissions);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const toggleSub = async (id: string, field: "tg_alerts" | "tg_briefs", next: boolean) => {
    const key = `${id}:${field}`;
    setToggling(key);
    setCommissions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: next ? 1 : 0 } : c)),
    );
    try {
      const { commission } = await updateCommissionSubscriptions(id, { [field]: next });
      setCommissions((prev) => prev.map((c) => (c.id === commission.id ? commission : c)));
    } catch (e) {
      setErr((e as Error).message);
      setCommissions((prev) =>
        prev.map((c) => (c.id === id ? { ...c, [field]: next ? 0 : 1 } : c)),
      );
    } finally {
      setToggling(null);
    }
  };

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
    <div className="border-t border-ink-light/10 px-4 py-3 font-mono text-label-sm">
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

          <div className="pt-2 mt-1 border-t border-ink-light/10">
            <button
              onClick={() => setSubsOpen((v) => !v)}
              className="w-full flex items-center justify-between text-ink-light-muted text-[10px] uppercase tracking-widest hover:text-accent-lime transition-colors"
            >
              <span>transmit per commission ({commissions.length})</span>
              <span>{subsOpen ? "−" : "+"}</span>
            </button>

            {subsOpen && (
              <div className="mt-2">
                {commissions.length === 0 && (
                  <div className="text-ink-light-muted text-[10px]">no active commissions</div>
                )}
                {commissions.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-ink-light-muted text-[10px] uppercase tracking-widest">
                      <span className="flex-1">commission</span>
                      <span className="w-10 text-center">alert</span>
                      <span className="w-10 text-center">brief</span>
                    </div>
                    {commissions.map((c) => {
                      const aKey = `${c.id}:tg_alerts`;
                      const bKey = `${c.id}:tg_briefs`;
                      return (
                        <div key={c.id} className="flex items-center gap-1">
                          <span className="flex-1 text-ink-light text-[10px] truncate" title={c.query_text}>
                            {c.query_text}
                          </span>
                          <SubToggle
                            on={c.tg_alerts === 1}
                            loading={toggling === aKey}
                            onChange={(v) => toggleSub(c.id, "tg_alerts", v)}
                          />
                          <SubToggle
                            on={c.tg_briefs === 1}
                            loading={toggling === bKey}
                            onChange={(v) => toggleSub(c.id, "tg_briefs", v)}
                          />
                        </div>
                      );
                    })}
                    <div className="text-ink-light-muted text-[10px] pt-1">
                      <span className="text-ink-light">alert</span>: rule fires on RUN ·{" "}
                      <span className="text-ink-light">brief</span>: digest per batch
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SubToggle({
  on,
  loading,
  onChange,
}: {
  on: boolean;
  loading: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      disabled={loading}
      className={`w-10 px-1.5 py-0.5 text-[10px] uppercase tracking-widest border transition-colors ${
        loading
          ? "opacity-50 cursor-wait"
          : on
          ? "bg-accent-lime text-bg-dark border-accent-lime hover:bg-accent-lime-bright"
          : "text-ink-light-muted border-ink-light/15 hover:border-accent-lime/60 hover:text-accent-lime"
      }`}
    >
      {on ? "on" : "off"}
    </button>
  );
}
