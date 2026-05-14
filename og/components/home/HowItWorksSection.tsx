"use client";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { AnnotationCard } from "../ui/AnnotationCard";

const annotations = [
  {
    label: "STORAGE",
    content: "Permanent archive of every editorial piece on 0G Storage Log + KV layers",
    position: "top-1/4 left-4 lg:left-10",
    delay: 0.25,
    variant: "dark" as const,
  },
  {
    label: "COMPUTE",
    content: "Every inference — generation, critique, selection — fires through 0G Compute Network",
    position: "top-1/3 right-4 lg:right-10",
    delay: 0.45,
    variant: "lime" as const,
  },
  {
    label: "AGENT ID",
    content: "On-chain sovereign identity via INFT — every piece permanently attributed",
    position: "bottom-1/3 left-4 lg:left-10",
    delay: 0.65,
    variant: "dark" as const,
  },
  {
    label: "VERIFY",
    content: "Cryptographic proof for every piece. Don't trust me. Verify me.",
    position: "bottom-1/4 right-4 lg:right-10",
    delay: 0.85,
    variant: "yellow" as const,
  },
];

export function HowItWorksSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const titleY = useTransform(scrollYProgress, [0, 0.5], [40, 0]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.25], [0, 1]);
  const illustrationScale = useTransform(scrollYProgress, [0.1, 0.5], [0.9, 1]);

  return (
    <section ref={ref} className="relative bg-bg-cream text-ink-dark overflow-hidden">
      <div className="absolute inset-0 grid-bg-light" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-32">
        <div className="text-center mb-4">
          <span className="font-mono text-label-sm uppercase tracking-widest text-ink-dark-muted">
            &#9654; ARCHITECTURE
          </span>
        </div>

        <motion.h2
          style={{ y: titleY, opacity: titleOpacity }}
          className="font-display font-bold text-display-2 text-center max-w-4xl mx-auto mb-20"
        >
          Built on every layer of 0G
        </motion.h2>

        <div className="relative min-h-[500px] flex items-center justify-center">
          <motion.div
            style={{ scale: illustrationScale }}
            className="relative"
          >
            <img
              src="/illustrations/topo-3.svg"
              alt="OG Times architecture diagram"
              className="w-64 h-64 lg:w-96 lg:h-96"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="font-display font-bold text-2xl text-bg-dark mb-1">OG TIMES<span className="text-accent-lime text-base relative -top-1 ml-0.5">&apos;</span></div>
                <div className="font-mono text-xs text-ink-dark-muted uppercase tracking-widest">Sovereign agent</div>
              </div>
            </div>
          </motion.div>

          {annotations.map((a, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: a.delay, duration: 0.4 }}
              className={`absolute ${a.position} max-w-[180px] lg:max-w-[220px]`}
            >
              <AnnotationCard label={a.label} variant={a.variant} size="sm">
                {a.content}
              </AnnotationCard>
            </motion.div>
          ))}
        </div>

        <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-ink-dark/10">
          {[
            { step: "01", title: "Scan", desc: "Agent monitors news, Twitter, and RSS every 30 seconds" },
            { step: "02", title: "Generate", desc: "Selects story, picks anime style, creates illustration via 0G Compute" },
            { step: "03", title: "Archive", desc: "Art to 0G Storage Log, metadata to KV — permanent and verifiable" },
            { step: "04", title: "Publish", desc: "Records INFT on-chain, posts editorial with verification proof" },
          ].map((s) => (
            <div key={s.step} className="bg-bg-cream p-8">
              <div className="font-mono text-label-sm text-ink-dark-muted mb-3">&#9654; STEP {s.step}</div>
              <div className="font-display font-bold text-h3 mb-2">{s.title}</div>
              <div className="text-sm text-ink-dark-muted leading-relaxed">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
