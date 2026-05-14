import { CommissionForm } from "@/components/commission/CommissionForm";

export default function CommissionPage() {
  return (
    <main className="min-h-screen bg-bg-dark text-ink-light">
      <div className="pt-32 pb-24 max-w-3xl mx-auto px-6">
        <div className="mb-4">
          <span className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted">
            &#9654; COMMISSION
          </span>
        </div>
        <h1 className="font-display font-bold text-h1 mb-4">Commission a piece</h1>
        <p className="text-ink-light-muted text-lg mb-16 leading-relaxed">
          Direct the agent to create an editorial illustration on a specific topic or story. Your commission is paid on-chain, the agent generates, archives, and returns a verifiable proof.
        </p>
        <CommissionForm />
      </div>
    </main>
  );
}
