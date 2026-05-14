import { StatCard } from "@/components/ui/StatCard";
import { BracketCard } from "@/components/ui/BracketCard";
import { LiveFeed } from "@/components/agent/LiveFeed";
import { INFT_ADDRESS } from "@/lib/mock";

const MODULE_STATUS = [
  { name: "0G Storage Log", status: "connected", lastActivity: "12:34:14", txCount: 142 },
  { name: "0G Storage KV", status: "connected", lastActivity: "12:34:14", txCount: 142 },
  { name: "0G Compute Network", status: "connected", lastActivity: "12:34:08", txCount: 284 },
  { name: "Agent ID (INFT)", status: "connected", lastActivity: "12:34:17", txCount: 142 },
  { name: "0G Verification", status: "connected", lastActivity: "12:34:17", txCount: 142 },
  { name: "Commission Queue", status: "connected", lastActivity: "10:22:03", txCount: 7 },
];

export default function AgentPage() {
  return (
    <main className="min-h-screen bg-bg-dark text-ink-light">
      <div className="pt-8 pb-24 max-w-7xl mx-auto px-6">
          <div className="mb-4">
            <span className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted">
              &#9654; TRANSPARENCY DASHBOARD
            </span>
          </div>
          <div className="flex items-end justify-between mb-16">
            <h1 className="font-display font-bold text-h1">Agent dashboard</h1>
            <div className="flex items-center gap-2 font-mono text-label-sm uppercase tracking-widest text-accent-lime">
              <span className="w-2 h-2 bg-accent-lime rounded-full animate-pulse" />
              LIVE
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <StatCard label="WALLET BALANCE" value="4.2 OG" description="Agent wallet — earns from commissions" variant="dark" />
            <StatCard label="COMPUTE BALANCE" value="12.8 OG" description="Prepaid 0G Compute Network balance" variant="dark" />
            <StatCard label="PIECES PUBLISHED" value="142" description="Lifetime editorial output" variant="dark" />
            <StatCard label="COMMISSIONS EARNED" value="$0.00" description="Total revenue received" variant="dark" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
            <div>
              <div className="font-mono text-label uppercase tracking-widest text-ink-light-muted mb-6">
                &#9654; 0G MODULE HEALTH
              </div>
              <div className="space-y-px">
                {MODULE_STATUS.map((m) => (
                  <div key={m.name} className="bg-bg-dark-2 border border-ink-light/5 px-5 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 bg-accent-lime rounded-full shrink-0" />
                      <span className="text-sm">{m.name}</span>
                    </div>
                    <div className="flex items-center gap-6 font-mono text-xs text-ink-light-muted">
                      <span>{m.txCount} txs</span>
                      <span>{m.lastActivity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="font-mono text-label uppercase tracking-widest text-ink-light-muted mb-6">
                &#9654; LIVE ACTIVITY
              </div>
              <LiveFeed maxHeight="340px" />
            </div>
          </div>

          <div id="verify">
            <div className="font-mono text-label uppercase tracking-widest text-ink-light-muted mb-6">
              &#9654; AGENT INFT PROFILE
            </div>
            <BracketCard variant="lime" className="bg-bg-dark-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-4">
                  {[
                    { label: "TOKEN ID", value: "#0" },
                    { label: "CONTRACT", value: `${INFT_ADDRESS.slice(0, 8)}...${INFT_ADDRESS.slice(-6)}` },
                    { label: "NETWORK", value: "0G Chain" },
                    { label: "PIECES", value: "142 published" },
                  ].map((row) => (
                    <div key={row.label}>
                      <span className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted block mb-1">&#9654; {row.label}</span>
                      <span className="font-mono text-sm text-ink-light">{row.value}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  <div className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted mb-4">&#9654; METADATA</div>
                  <p className="text-sm text-ink-light-muted leading-relaxed">
                    Full agent metadata is stored on 0G Storage and referenced in the INFT token URI. Includes agent config, creation timestamp, and cumulative activity log.
                  </p>
                  <a
                    href={`https://scan.0g.ai/token/${INFT_ADDRESS}/0`}
                    target="_blank"
                    rel="noopener"
                    className="inline-block font-mono text-label-sm uppercase tracking-widest text-accent-lime hover:text-accent-lime-bright transition-colors mt-4"
                  >
                    &#9654; View on 0G Explorer &#8599;
                  </a>
                </div>
              </div>
            </BracketCard>
          </div>
      </div>
    </main>
  );
}
