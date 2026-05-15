"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Logo } from "../ui/Logo";
import { AuthButton } from "../ui/AuthButton";
import { ConnectWallet } from "../wallet/ConnectWallet";
import { TelegramSection } from "../wallet/TelegramSection";
import { fetchNewsStatus } from "@/lib/api";

interface NavItem {
  href: string;
  label: string;
  letter: string;
}

const NAV: NavItem[] = [
  { href: "/dashboard",            label: "Dashboard",  letter: "D" },
  { href: "/sources",              label: "Sources",    letter: "S" },
  { href: "/agent",                label: "Audit Log",  letter: "L" },
];

function activeHref(pathname: string): string | null {
  let match: string | null = null;
  for (const item of NAV) {
    if (pathname === item.href || pathname.startsWith(item.href + "/")) {
      if (!match || item.href.length > match.length) match = item.href;
    }
  }
  return match;
}

const STORAGE_KEY = "sidebar-collapsed";

interface SidebarContextValue {
  collapsed: boolean;
  toggle: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      }
      return next;
    });
  }, []);

  return (
    <SidebarContext.Provider value={{ collapsed, toggle, mobileOpen, setMobileOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggle, mobileOpen, setMobileOpen } = useSidebar();
  const [statusAgeS, setStatusAgeS] = useState<number | null>(null);
  const [statusOk, setStatusOk] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await fetchNewsStatus();
        if (cancelled) return;
        setStatusAgeS(Math.floor(r.ageMs / 1000));
        setStatusOk(r.providers.some((p) => p.ok));
      } catch {
        if (cancelled) return;
        setStatusAgeS(null);
        setStatusOk(false);
      }
    };
    poll();
    const id = setInterval(poll, 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const widthClass = collapsed ? "w-16" : "w-56";

  const currentActive = activeHref(pathname);
  const navList = (
    <nav className="flex-1 overflow-y-auto py-3">
      {NAV.map((item) => {
        const active = currentActive === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`group flex items-center gap-3 px-4 py-2.5 font-mono text-label uppercase tracking-widest transition-colors border-l-2 ${
              active
                ? "text-accent-lime border-accent-lime bg-bg-dark-2"
                : "text-ink-light-muted border-transparent hover:text-ink-light hover:bg-bg-dark-2/50"
            }`}
            title={collapsed ? item.label : undefined}
          >
            <span className={`shrink-0 ${active ? "text-accent-lime" : "text-ink-light-muted group-hover:text-ink-light"}`}>
              {collapsed ? item.letter : "▶"}
            </span>
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );

  const statusPill = (
    <div className={`px-4 py-3 border-t border-ink-light/10 font-mono text-label-sm ${collapsed ? "text-center" : ""}`}>
      <div className="flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusOk ? "bg-accent-lime animate-pulse" : "bg-accent-orange"}`} />
        {!collapsed && (
          <span className="text-ink-light-muted uppercase tracking-widest truncate">
            {statusOk
              ? statusAgeS == null
                ? "live"
                : `live · ${statusAgeS}s ago`
              : "offline"}
          </span>
        )}
      </div>
    </div>
  );

  const sidebarContent = (
    <div className="flex h-full flex-col bg-bg-dark text-ink-light">
      <div className={`flex items-center gap-3 px-4 py-3 border-b border-ink-light/10 ${collapsed ? "justify-center" : "justify-between"}`}>
        {!collapsed && (
          <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
            <Logo />
          </Link>
        )}
        <div className={collapsed ? "" : "shrink-0"}>
          <AuthButton />
        </div>
      </div>

      {navList}
      <ConnectWallet collapsed={collapsed} />
      {!collapsed && <TelegramSection />}
      {statusPill}

      <button
        onClick={toggle}
        className="hidden md:flex items-center justify-center px-4 py-3 border-t border-ink-light/10 font-mono text-label-sm uppercase tracking-widest text-ink-light-muted hover:text-accent-lime transition-colors"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? "▶" : "◀  Collapse"}
      </button>
    </div>
  );

  return (
    <>
      <aside
        className={`hidden md:flex fixed inset-y-0 left-0 z-40 ${widthClass} border-r border-ink-light/10 transition-[width] duration-200`}
      >
        {sidebarContent}
      </aside>

      <button
        className="md:hidden fixed top-3 left-3 z-50 p-2 bg-bg-dark text-ink-light border border-ink-light/20 rounded"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <div className="w-5 space-y-1">
          <span className="block h-px bg-current" />
          <span className="block h-px bg-current" />
          <span className="block h-px bg-current" />
        </div>
      </button>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-64 h-full">{sidebarContent}</div>
          <button
            className="flex-1 bg-black/60"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          />
        </div>
      )}
    </>
  );
}
