import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { OnChainProof } from "@/components/piece/OnChainProof";
import { EditorialCard } from "@/components/feed/EditorialCard";
import { MOCK_PIECES } from "@/lib/mock";

export default async function PiecePage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  const piece = MOCK_PIECES.find((p) => p.rootHash === hash);

  if (!piece) notFound();

  const related = MOCK_PIECES.filter((p) => p.rootHash !== piece.rootHash && p.topic === piece.topic).slice(0, 3);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-bg-cream text-ink-dark">
        <div className="pt-24 max-w-7xl mx-auto px-6">
          <div className="py-8 border-b border-ink-dark/10">
            <Link href="/explore" className="font-mono text-label-sm uppercase tracking-widest text-ink-dark-muted hover:text-accent-lime transition-colors">
              &#8592; Back to archive
            </Link>
          </div>

          <div className="py-16 grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div className="aspect-square bg-bg-dark relative overflow-hidden">
              <div className="absolute inset-0 grid-bg-dark" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center px-8">
                  <span className="font-mono text-label-sm uppercase tracking-widest text-accent-lime mb-3 block">
                    &#9654; {piece.topic.toUpperCase()} &mdash; {piece.style.toUpperCase()} STYLE
                  </span>
                  <p className="font-mono text-xs text-ink-light-muted opacity-60 leading-relaxed">
                    Editorial illustration #{piece.pieceIndex}
                  </p>
                </div>
              </div>
              <div className="absolute bottom-4 left-4 right-4 text-center">
                <span className="font-mono text-xs text-ink-light-muted opacity-40">
                  {piece.rootHash.slice(0, 12)}...{piece.rootHash.slice(-8)}
                </span>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <span className="font-mono text-label-sm uppercase tracking-widest text-accent-lime">
                  &#9654; {piece.topic.toUpperCase()}
                </span>
                <h1 className="font-display font-bold text-h1 mt-3 leading-tight">{piece.headline}</h1>
              </div>

              <p className="text-lg text-ink-dark-muted leading-relaxed">{piece.take}</p>

              {piece.sourceUrl && (
                <div>
                  <span className="font-mono text-label-sm uppercase tracking-widest text-ink-dark-muted block mb-2">
                    &#9654; STORY SOURCE
                  </span>
                  <a href={piece.sourceUrl} target="_blank" rel="noopener" className="text-sm text-accent-lime hover:text-accent-lime-bright transition-colors">
                    {piece.sourceTitle ?? piece.sourceUrl} &#8599;
                  </a>
                </div>
              )}

              <div className="flex gap-6">
                <div>
                  <span className="font-mono text-label-sm uppercase tracking-widest text-ink-dark-muted block mb-1">&#9654; STYLE</span>
                  <span className="text-sm capitalize">{piece.style}</span>
                </div>
                <div>
                  <span className="font-mono text-label-sm uppercase tracking-widest text-ink-dark-muted block mb-1">&#9654; PIECE</span>
                  <span className="text-sm">#{piece.pieceIndex}</span>
                </div>
                <div>
                  <span className="font-mono text-label-sm uppercase tracking-widest text-ink-dark-muted block mb-1">&#9654; BLOCK</span>
                  <span className="text-sm font-mono">{piece.blockNumber.toLocaleString()}</span>
                </div>
              </div>

              <OnChainProof piece={piece} />
            </div>
          </div>

          {related.length > 0 && (
            <div className="py-16 border-t border-ink-dark/10">
              <span className="font-mono text-label-sm uppercase tracking-widest text-ink-dark-muted">
                &#9654; RELATED PIECES
              </span>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {related.map((p) => (
                  <EditorialCard key={p.rootHash} piece={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
