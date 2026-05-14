import Link from "next/link";
import type { EditorialPiece } from "@/lib/types";

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const TOPIC_COLORS: Record<string, string> = {
  ai: "text-accent-lime",
  crypto: "text-accent-blue",
  tech: "text-accent-orange",
  policy: "text-accent-yellow",
  culture: "text-ink-light-muted",
};

export function EditorialCard({ piece, size = "md" }: { piece: EditorialPiece; size?: "sm" | "md" | "lg" }) {
  const topicColor = TOPIC_COLORS[piece.topic] ?? "text-ink-light-muted";
  const aspectClass = size === "lg" ? "aspect-[16/9]" : "aspect-[4/5]";

  return (
    <Link href={`/piece/${piece.rootHash}`} className="group relative block">
      <div className={`${aspectClass} overflow-hidden bg-bg-dark-2 relative`}>
        <div className="absolute inset-0 grid-bg-dark opacity-50" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-6">
            <span className={`font-mono text-label-sm uppercase tracking-widest ${topicColor} mb-3 block`}>
              &#9654; {piece.topic.toUpperCase()}
            </span>
            <p className="text-ink-light-muted text-xs font-mono opacity-60 leading-relaxed max-w-48">
              {piece.style} editorial — piece #{piece.pieceIndex}
            </p>
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-bg-dark/80 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <span className="font-mono text-xs text-ink-light-muted opacity-70">
            {piece.rootHash.slice(0, 8)}...{piece.rootHash.slice(-6)}
          </span>
        </div>
        <div className="absolute inset-0 border border-ink-light/0 group-hover:border-accent-lime/30 transition-colors" />
      </div>
      <div className="mt-4 space-y-2">
        <div className={`flex items-center gap-2 font-mono text-label-sm uppercase tracking-widest ${topicColor}`}>
          <span>&#9654; {piece.topic.toUpperCase()}</span>
          <span className="opacity-40 text-ink-dark-muted">·</span>
          <span className="text-ink-dark-muted">{formatTimeAgo(piece.createdAt)}</span>
        </div>
        <h3 className={`font-display font-semibold leading-tight group-hover:text-accent-lime transition-colors ${size === "lg" ? "text-h2" : "text-h3"}`}>
          {piece.headline}
        </h3>
        <p className="text-sm text-ink-dark-muted line-clamp-2">{piece.take}</p>
      </div>
    </Link>
  );
}
