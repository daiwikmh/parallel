"use client";
import { useEffect, useState } from "react";

interface SessionUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export function UserMenu({ collapsed }: { collapsed?: boolean }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        setUser(data?.user ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !user) return null;

  const initial = (user.name ?? user.email ?? "?").trim().charAt(0).toUpperCase();
  const handleSignOut = async () => {
    try {
      const csrfRes = await fetch("/api/auth/csrf");
      const { csrfToken } = await csrfRes.json();
      const form = new FormData();
      form.set("csrfToken", csrfToken);
      form.set("callbackUrl", "/login");
      await fetch("/api/auth/signout", { method: "POST", body: form });
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  };

  if (collapsed) {
    return (
      <button
        onClick={handleSignOut}
        className="w-full px-2 py-2 flex items-center justify-center border-t border-ink-light/10 hover:bg-bg-dark-2 transition-colors"
        title={`${user.name ?? user.email ?? ""} · sign out`}
      >
        <span className="w-6 h-6 flex items-center justify-center bg-accent-lime/20 text-accent-lime font-mono text-label-sm">
          {initial}
        </span>
      </button>
    );
  }

  return (
    <div className="border-t border-ink-light/10 px-4 py-3">
      <div className="flex items-center gap-2 mb-2 min-w-0">
        <span className="shrink-0 w-7 h-7 flex items-center justify-center bg-accent-lime/20 text-accent-lime font-mono text-label-sm">
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-label-sm text-ink-light truncate">{user.name ?? "user"}</div>
          {user.email && (
            <div className="font-mono text-[10px] text-ink-light-muted truncate">{user.email}</div>
          )}
        </div>
      </div>
      <button
        onClick={handleSignOut}
        className="w-full px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-ink-light-muted border border-ink-light/10 hover:border-accent-orange/60 hover:text-accent-orange transition-colors"
      >
        sign out
      </button>
    </div>
  );
}
