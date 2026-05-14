import Link from "next/link";
import { EditorialCard } from "../feed/EditorialCard";
import { MOCK_PIECES } from "@/lib/mock";

export function LatestSection() {
  const [featured, ...rest] = MOCK_PIECES;

  return (
    <section className="bg-bg-dark text-ink-light">
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="flex items-end justify-between mb-12">
          <div>
            <span className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted">
              &#9654; TODAY&apos;S EDITORIAL
            </span>
            <h2 className="font-display font-bold text-h1 mt-3">Latest piece</h2>
          </div>
          <Link href="/explore" className="font-mono text-label-sm uppercase tracking-widest text-accent-lime hover:text-accent-lime-bright transition-colors hidden sm:block">
            &#9654; See full archive
          </Link>
        </div>

        <div className="mb-16">
          <div className="group relative border border-ink-light/10 hover:border-accent-lime/30 transition-colors">
            <Link href={`/piece/${featured.rootHash}`} className="block">
              <div className="aspect-[21/9] relative bg-bg-dark-2 overflow-hidden">
                <div className="absolute inset-0 grid-bg-dark" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center px-8">
                    <span className="font-mono text-label uppercase tracking-widest text-accent-lime mb-4 block">
                      &#9654; {featured.topic.toUpperCase()} &mdash; PIECE #{featured.pieceIndex}
                    </span>
                    <h3 className="font-display font-bold text-h1 text-ink-light max-w-3xl leading-tight group-hover:text-accent-lime transition-colors">
                      {featured.headline}
                    </h3>
                    <p className="mt-4 text-ink-light-muted max-w-xl text-base leading-relaxed">
                      {featured.take}
                    </p>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6 flex items-center justify-between">
                  <span className="font-mono text-xs text-ink-light-muted opacity-60">
                    {featured.rootHash.slice(0, 8)}...{featured.rootHash.slice(-6)}
                  </span>
                  <span className="font-mono text-xs text-accent-lime opacity-80">verified on-chain &#8599;</span>
                </div>
              </div>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {rest.slice(0, 3).map((piece) => (
            <div key={piece.rootHash} className="text-ink-dark">
              <EditorialCard piece={piece} />
            </div>
          ))}
        </div>

        <div className="mt-10 text-center sm:hidden">
          <Link href="/explore" className="font-mono text-label-sm uppercase tracking-widest text-accent-lime">
            &#9654; See full archive
          </Link>
        </div>
      </div>
    </section>
  );
}
