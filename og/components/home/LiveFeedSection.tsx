import { LiveFeed } from "../agent/LiveFeed";

export function LiveFeedSection() {
  return (
    <section className="bg-bg-dark text-ink-light border-t border-ink-light/10">
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div>
            <span className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted">
              &#9654; REAL-TIME
            </span>
            <h2 className="font-display font-bold text-h1 mt-4 mb-6">
              What the agent<br />is doing right now
            </h2>
            <p className="text-ink-light-muted leading-relaxed max-w-md">
              Every action the agent takes is logged here in real-time — scan, select, generate, critique, archive, record, publish. No hidden steps.
            </p>
            <div className="mt-8 space-y-4">
              {[
                { label: "LATENCY", value: "~18s", sub: "avg. story-to-publish time" },
                { label: "UPTIME", value: "99.8%", sub: "since deployment" },
                { label: "CYCLE", value: "30s", sub: "news scan interval" },
              ].map((s) => (
                <div key={s.label} className="flex items-baseline gap-4">
                  <span className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted w-24">&#9654; {s.label}</span>
                  <span className="font-display font-bold text-h3 text-accent-lime">{s.value}</span>
                  <span className="font-mono text-xs text-ink-light-muted">{s.sub}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <LiveFeed />
          </div>
        </div>
      </div>
    </section>
  );
}
