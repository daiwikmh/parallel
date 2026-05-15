"use client";
import { useEffect, useState } from "react";
import {
  fetchEntity,
  createCommission,
  type Commission,
  type EntityDetail,
  type GraphEdge,
  type GraphNode,
  type Classification,
} from "@/lib/api";

interface Props {
  selectedNode: GraphNode | null;
  selectedEdge: GraphEdge | null;
  activeCommissions: Commission[];
  onCommissionCreated: (c: Commission, cls: Classification) => void;
}

export function ContextPanel({
  selectedNode,
  selectedEdge,
  activeCommissions,
  onCommissionCreated,
}: Props) {
  if (selectedEdge) return <EdgePanel edge={selectedEdge} />;
  if (selectedNode)
    return (
      <NodePanel
        node={selectedNode}
        activeCommissions={activeCommissions}
        onCommissionCreated={onCommissionCreated}
      />
    );
  return <EmptyPanel activeCommissions={activeCommissions} />;
}

function EmptyPanel({ activeCommissions }: { activeCommissions: Commission[] }) {
  return (
    <div className="p-4">
      <div className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted mb-3">
        ▶ CONTEXT
      </div>
      <p className="font-mono text-label-sm text-ink-light-muted leading-relaxed">
        Click a node or edge to inspect. Run a commission to see its graph populate.
      </p>
      <div className="mt-6 font-mono text-label-sm uppercase tracking-widest text-ink-light-muted mb-2">
        ▶ SUMMARY
      </div>
      <div className="font-mono text-label-sm text-ink-light">
        <div>{activeCommissions.length} active commission{activeCommissions.length === 1 ? "" : "s"}</div>
      </div>
    </div>
  );
}

function NodePanel({
  node,
  activeCommissions,
  onCommissionCreated,
}: {
  node: GraphNode;
  activeCommissions: Commission[];
  onCommissionCreated: (c: Commission, cls: Classification) => void;
}) {
  const [detail, setDetail] = useState<EntityDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [commissioning, setCommissioning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setDetail(null);
    setError(null);
    fetchEntity(node.id)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [node.id]);

  const alreadyCommissioned = activeCommissions.some((c) => c.entity_id === node.id);

  const commissionThis = async () => {
    if (commissioning) return;
    setCommissioning(true);
    setError(null);
    try {
      const { commission, classification } = await createCommission(node.label);
      onCommissionCreated(commission, classification);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCommissioning(false);
    }
  };

  return (
    <div className="p-4">
      <div className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted mb-3">
        ▶ ENTITY
      </div>
      <div className="mb-1 font-mono text-label-sm uppercase tracking-widest text-accent-lime">
        {node.type}
      </div>
      <div className="font-display font-bold text-h3 mb-1">{node.label}</div>
      <div className="font-mono text-label-sm text-ink-light-muted break-all mb-4">{node.id}</div>

      {detail && detail.entity.aliases.length > 0 && (
        <div className="mb-4">
          <div className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted mb-1">
            ▶ ALIASES
          </div>
          <div className="font-mono text-label-sm text-ink-light">
            {detail.entity.aliases.join(", ")}
          </div>
        </div>
      )}

      {detail && <AttributesBlock entity={detail.entity} />}

      <button
        onClick={commissionThis}
        disabled={commissioning || alreadyCommissioned}
        className="w-full px-4 py-2 bg-accent-lime text-bg-dark font-mono text-label-sm uppercase tracking-widest hover:bg-accent-lime-bright disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {alreadyCommissioned
          ? "✓ already commissioned"
          : commissioning
          ? "▶ commissioning…"
          : "▸ commission this entity"}
      </button>

      {error && (
        <div className="mt-3 border border-accent-orange/60 bg-accent-orange/10 px-3 py-2 font-mono text-label-sm text-accent-orange">
          ▶ {error}
        </div>
      )}

      <div className="mt-6 font-mono text-label-sm uppercase tracking-widest text-ink-light-muted mb-2">
        ▶ EDGES {detail ? `(${detail.edges.length})` : ""}
      </div>
      {loading && <div className="font-mono text-label-sm text-ink-light-muted">▶ loading…</div>}
      {detail && detail.edges.length === 0 && (
        <div className="font-mono text-label-sm text-ink-light-muted">no edges yet</div>
      )}
      {detail && (
        <div className="space-y-3 max-h-80 overflow-auto pr-1">
          {detail.edges.slice(0, 12).map((e) => {
            const other = e.src_id === node.id ? e.dst_id : e.src_id;
            const direction = e.src_id === node.id ? "→" : "←";
            return (
              <div key={e.id} className="border border-ink-light/10 px-3 py-2">
                <div className="font-mono text-label-sm">
                  <span className="text-accent-lime">{e.type}</span>{" "}
                  <span className="text-ink-light-muted">{direction}</span>{" "}
                  <span className="text-ink-light break-all">{other}</span>
                </div>
                {e.evidence && (
                  <div className="font-mono text-label-sm text-ink-light-muted mt-1 italic line-clamp-2">
                    &ldquo;{e.evidence}&rdquo;
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface TokenPriceAttr {
  symbol?: string;
  price_usd?: number;
  market_cap_usd?: number;
  volume_24h_usd?: number;
  change_24h_pct?: number | null;
  change_7d_pct?: number | null;
  ath_usd?: number;
  fetched_at?: number;
}

function fmtUsd(n: number | undefined): string {
  if (n == null) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toPrecision(4)}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function AttributesBlock({ entity }: { entity: EntityDetail["entity"] }) {
  const attrs = entity.attributes ?? {};
  const price = attrs.price as TokenPriceAttr | undefined;
  const url = typeof attrs.url === "string" ? attrs.url : undefined;
  const source = typeof attrs.source === "string" ? attrs.source : undefined;
  const publishedAt = typeof attrs.published_at === "string" ? attrs.published_at : undefined;
  const fullTitle = typeof attrs.full_title === "string" ? attrs.full_title : undefined;

  const hasArticle = url || source || publishedAt || fullTitle;
  const hasPrice = price && typeof price.price_usd === "number";

  if (!hasArticle && !hasPrice) return null;

  return (
    <>
      {hasPrice && price && (
        <div className="mb-4 border border-ink-light/10 px-3 py-2">
          <div className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted mb-1">
            ▶ PRICE {price.symbol && <span className="text-ink-light">{price.symbol.toUpperCase()}</span>}
          </div>
          <div className="font-display font-bold text-h3 text-ink-light">
            {fmtUsd(price.price_usd)}
          </div>
          <div className="font-mono text-label-sm mt-1 flex gap-3">
            <span className={(price.change_24h_pct ?? 0) >= 0 ? "text-accent-lime" : "text-accent-orange"}>
              24h {fmtPct(price.change_24h_pct)}
            </span>
            {price.change_7d_pct != null && (
              <span className={(price.change_7d_pct ?? 0) >= 0 ? "text-accent-lime" : "text-accent-orange"}>
                7d {fmtPct(price.change_7d_pct)}
              </span>
            )}
          </div>
          <div className="font-mono text-label-sm text-ink-light-muted mt-2">
            <div>mcap: <span className="text-ink-light">{fmtUsd(price.market_cap_usd)}</span></div>
            <div>vol 24h: <span className="text-ink-light">{fmtUsd(price.volume_24h_usd)}</span></div>
            {price.ath_usd != null && <div>ath: <span className="text-ink-light">{fmtUsd(price.ath_usd)}</span></div>}
          </div>
        </div>
      )}

      {hasArticle && (
        <div className="mb-4 border border-ink-light/10 px-3 py-2">
          <div className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted mb-2">
            ▶ ARTICLE
          </div>
          {fullTitle && (
            <div className="font-mono text-label-sm text-ink-light mb-2">{fullTitle}</div>
          )}
          {source && (
            <div className="font-mono text-label-sm text-ink-light-muted">
              source: <span className="text-ink-light">{source}</span>
            </div>
          )}
          {publishedAt && (
            <div className="font-mono text-label-sm text-ink-light-muted">
              published: <span className="text-ink-light">{new Date(publishedAt).toLocaleString()}</span>
            </div>
          )}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-2 font-mono text-label-sm uppercase tracking-widest text-accent-lime hover:text-accent-lime-bright transition-colors"
            >
              ▸ view original ↗
            </a>
          )}
        </div>
      )}
    </>
  );
}

function EdgePanel({ edge }: { edge: GraphEdge }) {
  return (
    <div className="p-4">
      <div className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted mb-3">
        ▶ EDGE
      </div>
      <div className="mb-3 font-mono text-label-sm uppercase tracking-widest text-accent-lime">
        {edge.type}
      </div>
      <div className="font-mono text-label-sm text-ink-light break-all mb-1">{edge.src_id}</div>
      <div className="font-mono text-label-sm text-ink-light-muted">→</div>
      <div className="font-mono text-label-sm text-ink-light break-all mb-4">{edge.dst_id}</div>

      <div className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted mb-2">
        ▶ EVIDENCE
      </div>
      <div className="font-mono text-label-sm text-ink-light italic border-l-2 border-accent-lime/40 pl-3 py-1 mb-4">
        {edge.evidence ? `"${edge.evidence}"` : <span className="text-ink-light-muted">none recorded</span>}
      </div>

      <div className="font-mono text-label-sm text-ink-light-muted">
        confidence: <span className="text-ink-light">{edge.confidence.toFixed(2)}</span>
      </div>
      <div className="font-mono text-label-sm text-ink-light-muted mt-1">
        observed: <span className="text-ink-light">{new Date(edge.observed_at).toLocaleString()}</span>
      </div>
      {edge.article_id && (
        <div className="font-mono text-label-sm text-ink-light-muted mt-1 break-all">
          article: <span className="text-ink-light">{edge.article_id}</span>
        </div>
      )}
    </div>
  );
}
