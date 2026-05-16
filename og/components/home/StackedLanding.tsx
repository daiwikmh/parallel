"use client";

import { useRef } from "react";
import Link from "next/link";
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { Button } from "../ui/Button";

const PANELS = 3;

function Panel({
  index,
  progress,
  className = "",
  children,
}: {
  index: number;
  progress: MotionValue<number>;
  className?: string;
  children: React.ReactNode;
}) {
  const isLast = index === PANELS - 1;
  const start = index / (PANELS - 1);
  const end = (index + 1) / (PANELS - 1);

  const cover = useTransform(
    progress,
    isLast ? [0, 1] : [start, end],
    isLast ? [0, 0] : [0, 1]
  );
  const scale = useTransform(cover, [0, 1], [1, 0.92]);
  const overlayOpacity = useTransform(cover, [0, 1], [0, 0.6]);

  return (
    <motion.section
      style={{ scale, zIndex: index + 1 }}
      className={`sticky top-0 h-screen overflow-hidden rounded-t-[28px] shadow-[0_-30px_60px_-15px_rgba(15,31,18,0.5)] ${className}`}
    >
      {children}
      <motion.div
        aria-hidden
        style={{ opacity: overlayOpacity }}
        className="pointer-events-none absolute inset-0 bg-bg-dark"
      />
    </motion.section>
  );
}

function HeroPanel({ hint }: { hint: MotionValue<number> }) {
  return (
    <div className="relative h-full bg-bg-dark text-ink-light">
      <div className="absolute inset-0 grid-bg-dark-lg" />
      <img
        src="/illustrations/topo-1.svg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute -top-10 right-0 w-[42vw] max-w-[520px] select-none opacity-20"
      />
      <img
        src="/illustrations/topo-2.svg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute bottom-10 left-0 w-[30vw] max-w-[380px] select-none opacity-[0.13]"
      />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        <motion.img
          src="/logo.png"
          alt="Frame0"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="mb-6 w-20 h-20 object-contain select-none"
        />
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 font-mono text-label uppercase tracking-widest text-accent-lime"
        >
          &#9654; Private intelligence on 0G
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="max-w-5xl font-display text-display-1 font-bold leading-none"
        >
          A typed knowledge graph that{" "}
          <span className="text-accent-lime text-glow-lime">compounds</span> with every run
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-7 max-w-2xl text-lg leading-relaxed text-ink-light-muted"
        >
          Commission a topic. Frame0 turns scattered news and datasets into
          entities, typed relationships, and editorial briefs &mdash; with every
          LLM call signed by the 0G Compute router and every brief anchored to
          0G Storage.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="mt-10 flex flex-col gap-4 sm:flex-row"
        >
          <Link href="/dashboard">
            <Button variant="lime" size="lg">
              Open dashboard &#9654;
            </Button>
          </Link>
          <Link href="/about">
            <Button variant="ghost-light" size="lg">
              How it works
            </Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-label-sm uppercase tracking-widest text-ink-light-muted"
        >
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent-lime" />
            0G Compute
          </span>
          <span>0G Storage</span>
          <span>0G Chain</span>
        </motion.div>
      </div>

      <motion.div
        style={{ opacity: hint }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-label-sm uppercase tracking-widest text-ink-light-muted"
      >
        Scroll &#8595;
      </motion.div>
    </div>
  );
}

function FeaturesPanel() {
  const features = [
    {
      tag: "GRAPH",
      title: "Typed entities and relationships",
      body: "Seven entity types. Sixteen typed edge kinds. A domain/range validator rejects nonsense edges. Articles become nodes themselves, so sparse extractions still produce a navigable graph.",
    },
    {
      tag: "INFERENCE",
      title: "Every LLM call has a receipt",
      body: "Classify, brief, extract, chat. Every call goes through the 0G Compute router and returns a trace with the on-chain provider address, the cost in wei, and a request ID. We persist all of it.",
    },
    {
      tag: "STORAGE",
      title: "Anchored on 0G Storage",
      body: "Every brief is uploaded via the 0G Storage SDK and returns a content-addressed root hash. The Vault page shows anchored-on-0G vs local-only at a glance. Falls back gracefully when the storage wallet is unfunded.",
    },
    {
      tag: "CHAT",
      title: "Ask your graph",
      body: "Per-commission Q&A grounded in your entities, edges, briefs, and uploaded datasets. The system prompt enforces 'answer only from context.' No hallucinated connections.",
    },
    {
      tag: "ALERTS",
      title: "Material changes ping your Telegram",
      body: "Four rule kinds: entity mentioned, edge type added, keyword in evidence, sentiment drop. Per-commission toggles for alerts and brief digests, delivered in-app, via webhook, or to Telegram.",
    },
    {
      tag: "PAYMENT",
      title: "Settled on 0G Chain",
      body: "Two free RUN NOW per wallet, then 0.01 OG per commission unlock. Payment contract on Galileo testnet. The backend subscribes to the Paid event via viem and grants access automatically.",
    },
  ];

  return (
    <div className="relative h-full bg-bg-cream text-ink-dark">
      <div className="absolute inset-0 grid-bg-light" />
      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-center px-6 py-20 overflow-y-auto">
        <div className="mb-3 font-mono text-label-sm uppercase tracking-widest text-ink-dark-muted">
          &#9654; What it does
        </div>
        <h2 className="mb-10 max-w-3xl font-display text-display-2 font-bold leading-[1.05] lg:mb-12">
          Built end-to-end on 0G
        </h2>
        <div className="grid gap-px bg-ink-dark/10 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.tag} className="bg-bg-cream p-6 lg:p-7">
              <div className="mb-2 font-mono text-label-sm uppercase tracking-widest text-ink-dark-muted">
                &#9654; {f.tag}
              </div>
              <div className="mb-2 font-display text-h3 font-bold">{f.title}</div>
              <p className="max-w-md text-sm leading-relaxed text-ink-dark-muted">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CtaPanel() {
  return (
    <div className="relative flex h-full flex-col bg-bg-dark text-ink-light">
      <div className="absolute inset-0 grid-bg-dark-lg" />
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 font-mono text-label uppercase tracking-widest text-accent-lime">
          &#9654; Get started
        </div>
        <h2 className="max-w-4xl font-display text-display-1 font-bold leading-none">
          Commission your first topic
        </h2>
        <p className="mt-7 max-w-xl text-lg leading-relaxed text-ink-light-muted">
          Sign in with Google. Type a token, protocol, company, or jurisdiction.
          Watch the graph compound with every RUN NOW.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link href="/dashboard">
            <Button variant="lime" size="lg">
              Open dashboard &#9654;
            </Button>
          </Link>
          <Link href="/agent">
            <Button variant="ghost-light" size="lg">
              View audit log
            </Button>
          </Link>
        </div>
        <div className="mt-10 max-w-md font-mono text-label-sm uppercase tracking-widest text-ink-light-muted">
          Two free runs per wallet. After that, 0.01 OG per commission.
        </div>
      </div>
      <div className="relative z-10 border-t border-ink-light/10 px-6 py-5">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 font-mono text-xs text-ink-light-muted sm:flex-row">
          <span>&copy; Frame0 2026</span>
          <span>&#9654; Built on 0G Compute, Storage, and Chain</span>
        </div>
      </div>
    </div>
  );
}

export function StackedLanding() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const scrollHint = useTransform(scrollYProgress, [0, 0.04], [1, 0]);

  return (
    <div ref={ref} className="relative">
      <Panel index={0} progress={scrollYProgress}>
        <HeroPanel hint={scrollHint} />
      </Panel>
      <Panel index={1} progress={scrollYProgress}>
        <FeaturesPanel />
      </Panel>
      <Panel index={2} progress={scrollYProgress}>
        <CtaPanel />
      </Panel>
    </div>
  );
}
