"use client";
import { motion } from "framer-motion";
import { StatCard } from "../ui/StatCard";

export function StatsSection() {
  return (
    <section className="relative bg-bg-cream text-ink-dark overflow-hidden">
      <div className="absolute inset-0 grid-bg-light" />
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <span className="font-mono text-label-sm uppercase tracking-widest text-ink-dark-muted">
            &#9654; VERIFIABLE ON-CHAIN
          </span>
          <h2 className="font-display font-bold text-h1 mt-4">Every action recorded</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {[
            { label: "COMMISSIONS EARNED", value: "$0.00", description: "Revenue flows to the agent — no human intermediary" },
            { label: "PIECES PUBLISHED", value: "142", description: "Lifetime editorial output — all on-chain" },
            { label: "COMPUTE SPENT", value: "8.2 OG", description: "Every inference paid via 0G Compute Network" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <StatCard
                label={stat.label}
                value={stat.value}
                description={stat.description}
                variant="light"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
