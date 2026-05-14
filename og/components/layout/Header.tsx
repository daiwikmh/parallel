"use client";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "../ui/Logo";
import { AuthButton } from "../ui/AuthButton";
import { Button } from "../ui/Button";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-bg-dark/80 border-b border-ink-light/10">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/"><Logo /></Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <Link href="/explore" className="text-ink-light-muted hover:text-accent-lime transition-colors">Explore</Link>
          <Link href="/agent" className="text-ink-light-muted hover:text-accent-lime transition-colors">Agent</Link>
          <Link href="/commission" className="text-ink-light-muted hover:text-accent-lime transition-colors">Commission</Link>
          <Link href="/about" className="text-ink-light-muted hover:text-accent-lime transition-colors">About</Link>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="lime" size="sm">Open dashboard &#9654;</Button>
          </Link>
          <AuthButton />
        </div>

        <button
          className="md:hidden text-ink-light p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <div className="w-5 space-y-1.5">
            <span className={`block h-px bg-current transition-all ${mobileOpen ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block h-px bg-current transition-all ${mobileOpen ? "opacity-0" : ""}`} />
            <span className={`block h-px bg-current transition-all ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`} />
          </div>
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-bg-dark border-t border-ink-light/10 px-6 py-4 flex flex-col gap-4">
          <Link href="/explore" className="text-ink-light-muted hover:text-accent-lime py-2 font-mono text-label uppercase tracking-widest" onClick={() => setMobileOpen(false)}>&#9654; Explore</Link>
          <Link href="/agent" className="text-ink-light-muted hover:text-accent-lime py-2 font-mono text-label uppercase tracking-widest" onClick={() => setMobileOpen(false)}>&#9654; Agent</Link>
          <Link href="/commission" className="text-ink-light-muted hover:text-accent-lime py-2 font-mono text-label uppercase tracking-widest" onClick={() => setMobileOpen(false)}>&#9654; Commission</Link>
          <Link href="/about" className="text-ink-light-muted hover:text-accent-lime py-2 font-mono text-label uppercase tracking-widest" onClick={() => setMobileOpen(false)}>&#9654; About</Link>
          <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
            <Button variant="lime" size="sm" className="w-full mt-2 justify-center">Open dashboard &#9654;</Button>
          </Link>
          <AuthButton className="w-full mt-2" />
        </div>
      )}
    </header>
  );
}
