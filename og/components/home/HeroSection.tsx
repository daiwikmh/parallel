"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "../ui/Button";

const words = [
  { text: "Editorial", lime: false },
  { text: "illustrations", lime: false },
  { text: "on", lime: false },
  { text: "every story", lime: true },
  { text: "that", lime: false },
  { text: "matters", lime: false },
];

export function HeroSection({ totalPieces = 142 }: { totalPieces?: number }) {
  return (
    <section className="relative min-h-screen bg-bg-dark text-ink-light overflow-hidden flex flex-col">
      <div className="absolute inset-0 grid-bg-dark-lg" />

      <img
        src="/illustrations/topo-1.svg"
        alt=""
        className="absolute top-16 right-0 w-96 lg:w-[520px] opacity-20 pointer-events-none select-none"
      />
      <img
        src="/illustrations/topo-2.svg"
        alt=""
        className="absolute bottom-16 left-0 w-72 lg:w-96 opacity-15 pointer-events-none select-none"
      />

      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 py-32">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="font-mono text-label uppercase tracking-widest text-accent-lime mb-8"
        >
          &#9654; Autonomous AI Editorial Agent
        </motion.div>

        <h1 className="font-display font-bold text-display-1 text-center max-w-5xl leading-none">
          {words.map((w, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07, duration: 0.4 }}
              className={`inline-block mr-3 md:mr-4 ${w.lime ? "text-accent-lime text-glow-lime" : ""}`}
            >
              {w.text}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8 text-lg text-ink-light-muted max-w-2xl text-center leading-relaxed"
        >
          An autonomous AI editorial agent. Powered end-to-end by 0G.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mt-12 flex flex-col sm:flex-row gap-4"
        >
          <Link href="/explore">
            <Button variant="lime" size="lg">View latest</Button>
          </Link>
          <Link href="/about">
            <Button variant="ghost-light" size="lg">How it works</Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="absolute bottom-10 flex items-center gap-3 font-mono text-label-sm uppercase tracking-widest text-ink-light-muted"
        >
          <span className="w-2 h-2 bg-accent-lime rounded-full animate-pulse" />
          <span>&#9654; AGENT LIVE &mdash; {totalPieces} PIECES PUBLISHED &mdash; RUNNING ON 0G</span>
        </motion.div>
      </div>
    </section>
  );
}
