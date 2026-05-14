export default function GraphPage() {
  return (
    <main className="min-h-screen bg-bg-dark text-ink-light">
      <div className="pt-8 pb-24 px-6 md:px-8 max-w-6xl">
        <div className="mb-2">
          <span className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted">
            ▶ KNOWLEDGE GRAPH
          </span>
        </div>
        <h1 className="font-display font-bold text-h1 mb-4">Entity graph</h1>
        <p className="text-ink-light-muted max-w-2xl mb-12">
          Co-occurrence graph of entities mentioned across editorial pieces. Computed on demand from the requested time window — nothing precomputed, nothing stale.
        </p>

        <div className="border border-ink-light/10 p-12 text-center">
          <div className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted mb-4">
            ▶ PHASE 2 DEPENDENCY
          </div>
          <p className="text-ink-light-muted max-w-md mx-auto leading-relaxed">
            No entities yet. The graph populates once the editorial step (phase 2) starts extracting entities from published pieces. The visualization shell, time-window controls, and node click-through ship in the next slice.
          </p>
        </div>
      </div>
    </main>
  );
}
