import Link from "next/link";
import { BracketInput } from "../ui/BracketInput";

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string; external?: boolean }[] }) {
  return (
    <div>
      <div className="font-mono text-label-sm uppercase tracking-widest opacity-70 mb-4 text-ink-light">
        &#9654; {title}
      </div>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            {l.external ? (
              <a href={l.href} target="_blank" rel="noopener" className="text-sm text-ink-light-muted hover:text-accent-lime transition-colors">
                {l.label}
              </a>
            ) : (
              <Link href={l.href} className="text-sm text-ink-light-muted hover:text-accent-lime transition-colors">
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="bg-bg-dark text-ink-light border-t border-ink-light/10">
      <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-4 gap-8">
        <FooterColumn title="EXPLORE" links={[
          { label: "Latest pieces", href: "/explore" },
          { label: "Topic — AI", href: "/explore?topic=ai" },
          { label: "Topic — Crypto", href: "/explore?topic=crypto" },
          { label: "Topic — Tech", href: "/explore?topic=tech" },
          { label: "Commissions", href: "/commission" },
        ]} />
        <FooterColumn title="AGENT" links={[
          { label: "Dashboard", href: "/agent" },
          { label: "Wallet activity", href: "/agent#wallet" },
          { label: "Compute spend", href: "/agent#compute" },
          { label: "On-chain proofs", href: "/agent#verify" },
        ]} />
        <FooterColumn title="0G" links={[
          { label: "0G Storage", href: "https://docs.0g.ai", external: true },
          { label: "0G Compute", href: "https://docs.0g.ai", external: true },
          { label: "Agent ID (INFT)", href: "https://docs.0g.ai", external: true },
          { label: "0G Explorer", href: "https://scan.0g.ai", external: true },
        ]} />
        <div>
          <div className="font-mono text-label-sm uppercase tracking-widest opacity-70 mb-4 text-ink-light">
            &#9654; NEWSLETTER
          </div>
          <p className="text-sm text-ink-light-muted mb-6">
            Daily editorial digest. No human touches it.
          </p>
          <div className="text-ink-light">
            <BracketInput placeholder="Email address" type="email" />
          </div>
          <button className="mt-4 text-sm font-mono text-accent-lime hover:text-accent-lime-bright transition-colors uppercase tracking-widest">
            Subscribe &#9654;
          </button>
        </div>
      </div>
      <div className="border-t border-ink-light/10 px-6 py-6 max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-ink-light-muted font-mono">
        <span>&copy; Frame0 2026 — sovereign agent</span>
        <span>&#9654; POWERED BY 0G</span>
      </div>
    </footer>
  );
}
