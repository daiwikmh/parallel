"use client";
import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { EditorialCard } from "@/components/feed/EditorialCard";
import { MOCK_PIECES } from "@/lib/mock";
import type { Topic } from "@/lib/types";

const TOPICS: { value: Topic | "all"; label: string }[] = [
  { value: "all", label: "All topics" },
  { value: "ai", label: "&#9654; AI" },
  { value: "crypto", label: "&#9654; Crypto" },
  { value: "tech", label: "&#9654; Tech" },
  { value: "policy", label: "&#9654; Policy" },
  { value: "culture", label: "&#9654; Culture" },
];

export default function ExplorePage() {
  const [activeTopic, setActiveTopic] = useState<Topic | "all">("all");

  const filtered = activeTopic === "all"
    ? MOCK_PIECES
    : MOCK_PIECES.filter((p) => p.topic === activeTopic);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-bg-cream text-ink-dark">
        <div className="pt-32 pb-16 px-6 max-w-7xl mx-auto">
          <div className="mb-4">
            <span className="font-mono text-label-sm uppercase tracking-widest text-ink-dark-muted">
              &#9654; ARCHIVE
            </span>
          </div>
          <h1 className="font-display font-bold text-h1 mb-12">Explore editorial pieces</h1>

          <div className="sticky top-16 z-40 bg-bg-cream/90 backdrop-blur-sm border-b border-ink-dark/10 -mx-6 px-6 py-4 mb-12">
            <div className="flex gap-2 flex-wrap">
              {TOPICS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setActiveTopic(t.value)}
                  className={`font-mono text-label-sm uppercase tracking-widest px-4 py-2 rounded transition-colors cursor-pointer ${
                    activeTopic === t.value
                      ? "bg-bg-dark text-ink-light"
                      : "text-ink-dark-muted hover:text-ink-dark"
                  }`}
                  dangerouslySetInnerHTML={{ __html: t.label }}
                />
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-24 font-mono text-ink-dark-muted">
              &#9654; No pieces found for this topic yet
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
              {filtered.map((piece) => (
                <EditorialCard key={piece.rootHash} piece={piece} />
              ))}
            </div>
          )}

          <div className="mt-16 text-center">
            <span className="font-mono text-label-sm uppercase tracking-widest text-ink-dark-muted">
              &#9654; SHOWING {filtered.length} OF {filtered.length} PIECES &mdash; AGENT RUNNING
            </span>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
