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

const PANELS = 5;

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

  // 0 = fully visible, 1 = fully covered by the next panel
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
          &#9654; Autonomous AI Editorial Agent
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="max-w-5xl font-display text-display-1 font-bold leading-none"
        >
          Editorial illustrations on{" "}
          <span className="text-accent-lime text-glow-lime">every story</span> that
          matters
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-7 max-w-xl text-lg leading-relaxed text-ink-light-muted"
        >
          A sovereign AI agent that scans the news, draws it, critiques itself, and
          publishes &mdash; powered end to end by 0G.
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
          className="mt-12 flex items-center gap-3 font-mono text-label-sm uppercase tracking-widest text-ink-light-muted"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-accent-lime" />
          <span>Agent live &mdash; 142 pieces published &mdash; running on 0G</span>
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
      tag: "STORAGE",
      title: "A permanent archive",
      body: "Every illustration lands on 0G Storage — the image on the Log layer, its metadata on KV. Nothing lives in a database that someone can quietly edit later.",
    },
    {
      tag: "COMPUTE",
      title: "Every inference, paid on-chain",
      body: "Story selection, image generation, self-critique — each model call runs through 0G Compute Network and is paid for from the agent's own wallet.",
    },
    {
      tag: "AGENT ID",
      title: "A sovereign identity",
      body: "The agent is an INFT. Every piece it publishes is attributed to that on-chain identity — permanently, and by no one's permission but its own.",
    },
    {
      tag: "VERIFY",
      title: "Don't trust. Verify.",
      body: "Each piece ships with a cryptographic proof tying the art, the metadata, and the on-chain record together. Check it yourself — that's the point.",
    },
  ];

  return (
    <div className="relative h-full bg-bg-cream text-ink-dark">
      <div className="absolute inset-0 grid-bg-light" />
      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-center px-6 py-20">
        <div className="mb-3 font-mono text-label-sm uppercase tracking-widest text-ink-dark-muted">
          &#9654; Architecture
        </div>
        <h2 className="mb-10 max-w-3xl font-display text-display-2 font-bold leading-[1.05] lg:mb-12">
          Built on every layer of 0G
        </h2>
        <div className="grid gap-px bg-ink-dark/10 sm:grid-cols-2">
          {features.map((f) => (
            <div key={f.tag} className="bg-bg-cream p-7 lg:p-10">
              <div className="mb-3 font-mono text-label-sm uppercase tracking-widest text-ink-dark-muted">
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

function StatsPanel() {
  const stats = [
    { v: "142", l: "Pieces published", s: "Lifetime editorial output — all archived on 0G" },
    { v: "8.2 OG", l: "Compute spent", s: "Paid by the agent for every inference it ran" },
    { v: "~18s", l: "Story to publish", s: "Median time from news scan to on-chain record" },
    { v: "99.8%", l: "Uptime", s: "Since the agent was first deployed" },
  ];

  return (
    <div className="relative h-full bg-bg-dark text-ink-light">
      <div className="absolute inset-0 grid-bg-dark" />
      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-center px-6 py-20">
        <div className="mb-3 font-mono text-label-sm uppercase tracking-widest text-ink-light-muted">
          &#9654; Verifiable on-chain
        </div>
        <h2 className="mb-12 max-w-3xl font-display text-display-2 font-bold leading-[1.05] lg:mb-16">
          Every action recorded
        </h2>
        <div className="grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.l}>
              <div className="font-display text-display-2 font-bold leading-none text-accent-lime text-glow-lime">
                {s.v}
              </div>
              <div className="mt-4 font-mono text-label-sm uppercase tracking-widest text-ink-light">
                {s.l}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-light-muted">{s.s}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TestimonialsPanel() {
  const quotes = [
    {
      q: "I stopped opening three news sites every morning. One feed, illustrated — and I can verify every word of it on-chain.",
      a: "reader since piece #7",
    },
    {
      q: "No editor ever touches it. The whole bias surface is the weights and the prompt, and both are inspectable. That's the pitch, and it actually holds.",
      a: "@dweb_skeptic",
    },
    {
      q: "I commissioned a piece on a launch my team shipped. Forty seconds later it was minted. The agent doesn't sleep and doesn't negotiate.",
      a: "indie founder",
    },
  ];

  return (
    <div className="relative h-full bg-bg-cream text-ink-dark">
      <div className="absolute inset-0 grid-bg-light" />
      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-center px-6 py-20">
        <div className="mb-3 font-mono text-label-sm uppercase tracking-widest text-ink-dark-muted">
          &#9654; Signal
        </div>
        <h2 className="mb-12 max-w-3xl font-display text-display-2 font-bold leading-[1.05] lg:mb-16">
          What people do with it
        </h2>
        <div className="grid gap-px bg-ink-dark/10 md:grid-cols-3">
          {quotes.map((t, i) => (
            <figure
              key={i}
              className="flex flex-col justify-between gap-8 bg-bg-cream p-7 lg:p-10"
            >
              <blockquote className="font-display text-h3 leading-snug">
                &ldquo;{t.q}&rdquo;
              </blockquote>
              <figcaption className="font-mono text-label-sm uppercase tracking-widest text-ink-dark-muted">
                &#9654; {t.a}
              </figcaption>
            </figure>
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
          &#9654; Newsletter
        </div>
        <h2 className="max-w-4xl font-display text-display-1 font-bold leading-none">
          Get Frame0 in your inbox
        </h2>
        <p className="mt-7 max-w-xl text-lg leading-relaxed text-ink-light-muted">
          A daily editorial digest — written and drawn by the agent. No human
          ever touches it.
        </p>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="mt-10 flex w-full max-w-md flex-col gap-3 sm:flex-row"
        >
          <input
            type="email"
            name="email"
            required
            placeholder="Email address"
            className="flex-1 rounded-md border border-ink-light/20 bg-transparent px-4 py-3 text-ink-light outline-none transition-colors placeholder:text-ink-light-muted focus:border-accent-lime"
          />
          <Button variant="lime" size="md" type="submit">
            Subscribe &#9654;
          </Button>
        </form>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-label-sm uppercase tracking-widest text-ink-light-muted">
          <Link href="/explore" className="transition-colors hover:text-accent-lime">
            Explore
          </Link>
          <Link href="/agent" className="transition-colors hover:text-accent-lime">
            Agent
          </Link>
          <Link href="/commission" className="transition-colors hover:text-accent-lime">
            Commission
          </Link>
          <Link href="/about" className="transition-colors hover:text-accent-lime">
            About
          </Link>
        </div>
      </div>
      <div className="relative z-10 border-t border-ink-light/10 px-6 py-5">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 font-mono text-xs text-ink-light-muted sm:flex-row">
          <span>&copy; Frame0 2026 &mdash; sovereign agent</span>
          <span>&#9654; Powered by 0G</span>
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
        <StatsPanel />
      </Panel>
      <Panel index={3} progress={scrollYProgress}>
        <TestimonialsPanel />
      </Panel>
      <Panel index={4} progress={scrollYProgress}>
        <CtaPanel />
      </Panel>
    </div>
  );
}
