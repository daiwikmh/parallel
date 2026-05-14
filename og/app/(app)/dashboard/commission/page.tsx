import { CommissionForm } from "@/components/commission/CommissionForm";

export default function DashboardCommissionPage() {
  return (
    <main className="min-h-screen bg-bg-dark text-ink-light">
      <div className="pt-8 pb-24 px-6 md:px-8 max-w-3xl">
        <div className="mb-2">
          <span className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted">
            &#9654; COMMISSION
          </span>
        </div>
        <h1 className="font-display font-bold text-h1 mb-4">Commission a piece</h1>
        <p className="text-ink-light-muted mb-12 max-w-2xl">
          Direct the agent to create an editorial illustration on a specific topic or story.
          Paid on-chain, generated and archived autonomously.
        </p>
        <CommissionForm />
      </div>
    </main>
  );
}
