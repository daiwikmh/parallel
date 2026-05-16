"use client";
import { usePathname } from "next/navigation";
import { Sidebar, SidebarProvider, useSidebar } from "./Sidebar";

const TITLES: Record<string, string> = {
  "/dashboard":  "Dashboard",
  "/sources":    "Agent inbox",
  "/agent":      "Agent",
  "/graph":      "Knowledge graph",
  "/commission": "Commission",
};

function deriveTitle(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  const top = "/" + pathname.split("/").filter(Boolean)[0];
  return TITLES[top] ?? "Frame0";
}

function Topbar() {
  const pathname = usePathname();
  return (
    <div className="sticky top-0 z-30 h-12 bg-bg-dark/95 backdrop-blur border-b border-ink-light/10 flex items-center px-6 md:px-8">
      <div className="font-mono text-label uppercase tracking-widest text-ink-light-muted truncate">
        ▶ {deriveTitle(pathname)}
      </div>
    </div>
  );
}

function Content({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  const padLeft = collapsed ? "md:pl-16" : "md:pl-56";
  return (
    <div className={`min-h-screen ${padLeft} transition-[padding] duration-200`}>
      <Topbar />
      {children}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar />
      <Content>{children}</Content>
    </SidebarProvider>
  );
}
