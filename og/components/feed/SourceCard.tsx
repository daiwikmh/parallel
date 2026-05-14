import type { NewsItem } from "@/lib/api";

const KIND_COLOR: Record<string, string> = {
  rss: "text-accent-blue",
  hackernews: "text-accent-orange",
  reddit: "text-accent-yellow",
  github: "text-accent-lime",
  googleNews: "text-ink-dark-muted",
  twitter: "text-ink-dark-muted",
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function signalChips(item: NewsItem): string[] {
  const out: string[] = [];
  const s = item.signals;
  if (!s) return out;
  if (s.upvotes) out.push(`${s.upvotes} up`);
  if (s.comments) out.push(`${s.comments} comments`);
  if (s.stars) out.push(`${s.stars} stars`);
  return out;
}

export function SourceCard({ item }: { item: NewsItem }) {
  const kindColor = KIND_COLOR[item.source.kind] ?? "text-ink-dark-muted";
  const chips = signalChips(item);

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block border border-ink-dark/10 hover:border-accent-lime/60 bg-bg-cream-2 p-5 transition-colors"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className={`font-mono text-label-sm uppercase tracking-widest ${kindColor}`}>
          &#9654; {item.source.name}
        </span>
        <span className="opacity-40 text-ink-dark-muted">·</span>
        <span className="font-mono text-label-sm text-ink-dark-muted">
          {timeAgo(item.publishedAt)}
        </span>
        {typeof item.score === "number" && (
          <span className="ml-auto font-mono text-label-sm text-ink-dark-muted">
            score {item.score.toFixed(2)}
          </span>
        )}
      </div>
      <h3 className="font-display font-semibold text-h3 leading-tight text-ink-dark group-hover:text-accent-lime transition-colors">
        {item.title}
      </h3>
      <p className="mt-2 text-sm text-ink-dark-muted line-clamp-3">{item.summary}</p>
      {chips.length > 0 && (
        <div className="mt-3 flex gap-2 flex-wrap">
          {chips.map((c) => (
            <span
              key={c}
              className="font-mono text-label-sm text-ink-dark-muted border border-ink-dark/10 px-2 py-0.5"
            >
              {c}
            </span>
          ))}
        </div>
      )}
    </a>
  );
}
