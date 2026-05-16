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
  allNodes?: GraphNode[];
}

export function ContextPanel({
  selectedNode,
  selectedEdge,
  activeCommissions,
  onCommissionCreated,
  allNodes,
}: Props) {
  if (selectedEdge) return <EdgePanel edge={selectedEdge} allNodes={allNodes} />;
  if (selectedNode)
    return (
      <NodePanel
        node={selectedNode}
        activeCommissions={activeCommissions}
        onCommissionCreated={onCommissionCreated}
        allNodes={allNodes}
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
  allNodes,
}: {
  node: GraphNode;
  activeCommissions: Commission[];
  onCommissionCreated: (c: Commission, cls: Classification) => void;
  allNodes?: GraphNode[];
}) {
  const [detail, setDetail] = useState<EntityDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [commissioning, setCommissioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllEdges, setShowAllEdges] = useState(false);
  const [expandedEvidence, setExpandedEvidence] = useState<Set<number>>(new Set());

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
        ▶ CONNECTED VIA {detail ? `(${detail.edges.length})` : ""}
      </div>
      {loading && <div className="font-mono text-label-sm text-ink-light-muted">▶ loading…</div>}
      {detail && detail.edges.length === 0 && (
        <div className="font-mono text-label-sm text-ink-light-muted">
          no relationships extracted yet · run the commission or wait for the next batch
        </div>
      )}
      {detail && detail.edges.length > 0 && (
        <EdgeList
          nodeId={node.id}
          edges={detail.edges}
          allNodes={allNodes}
          showAll={showAllEdges}
          onToggleShowAll={() => setShowAllEdges((v) => !v)}
          expanded={expandedEvidence}
          onToggleEvidence={(id) =>
            setExpandedEvidence((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
        />
      )}
    </div>
  );
}

const EDGE_PREVIEW_LIMIT = 8;

function fmtRelativeDate(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function describeRelation(type: string, direction: "→" | "←"): string {
  const verbs: Record<string, string> = {
    founded: direction === "→" ? "founded" : "was founded by",
    works_at: direction === "→" ? "works at" : "employs",
    partners_with: "partners with",
    invests_in: direction === "→" ? "invests in" : "is backed by",
    regulates: direction === "→" ? "regulates" : "is regulated by",
    built_on: direction === "→" ? "is built on" : "hosts",
    competes_with: "competes with",
    mentions: direction === "→" ? "mentions" : "is mentioned in",
    affects: direction === "→" ? "affects" : "is affected by",
    holds_treasury_in: "holds treasury in",
    audited_by: direction === "→" ? "audited by" : "audited",
    exploited: direction === "→" ? "exploited" : "was exploited by",
    merged_into: direction === "→" ? "merged into" : "absorbed",
    forked_from: direction === "→" ? "forked from" : "spawned fork",
    announced: direction === "→" ? "announced" : "was announced by",
    denied: direction === "→" ? "denied" : "was denied by",
  };
  return verbs[type] ?? `${type} ${direction}`;
}

function EdgeList({
  nodeId,
  edges,
  allNodes,
  showAll,
  onToggleShowAll,
  expanded,
  onToggleEvidence,
}: {
  nodeId: string;
  edges: Array<GraphEdge & { properties: Record<string, unknown> }>;
  allNodes?: GraphNode[];
  showAll: boolean;
  onToggleShowAll: () => void;
  expanded: Set<number>;
  onToggleEvidence: (id: number) => void;
}) {
  const labelMap = new Map<string, { label: string; type: string }>();
  if (allNodes) {
    for (const n of allNodes) labelMap.set(n.id, { label: n.label, type: n.type });
  }
  const visible = showAll ? edges : edges.slice(0, EDGE_PREVIEW_LIMIT);

  return (
    <div className="space-y-2 max-h-[28rem] overflow-auto pr-1">
      {visible.map((e) => {
        const otherId = e.src_id === nodeId ? e.dst_id : e.src_id;
        const direction: "→" | "←" = e.src_id === nodeId ? "→" : "←";
        const other = labelMap.get(otherId);
        const otherLabel = other?.label ?? otherId;
        const otherType = other?.type;
        const isArticle = otherId.startsWith("event:article-");
        const isOpen = expanded.has(e.id);
        const evidence = e.evidence?.trim();
        const articleUrl = typeof e.properties?.url === "string" ? (e.properties.url as string) : undefined;
        const articleTitle = typeof e.properties?.full_title === "string" ? (e.properties.full_title as string) : undefined;

        return (
          <div key={e.id} className="border border-ink-light/10 px-3 py-2">
            <div className="font-mono text-label-sm text-ink-light leading-snug">
              <span className="text-ink-light-muted">this</span>{" "}
              <span className="text-accent-lime">{describeRelation(e.type, direction)}</span>{" "}
              <span className="text-ink-light break-words">{otherLabel}</span>
              {otherType && (
                <span className="ml-2 text-ink-light-muted uppercase tracking-widest text-[10px]">
                  {otherType}
                </span>
              )}
            </div>

            {evidence && (
              <button
                onClick={() => onToggleEvidence(e.id)}
                className="text-left w-full font-mono text-label-sm text-ink-light-muted mt-1.5 italic border-l-2 border-accent-lime/30 pl-2 hover:border-accent-lime/70 transition-colors"
                title={isOpen ? "Collapse evidence" : "Expand evidence"}
              >
                <span className={isOpen ? "" : "line-clamp-2"}>&ldquo;{evidence}&rdquo;</span>
              </button>
            )}

            <div className="font-mono text-[10px] text-ink-light-muted mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
              <span>
                conf <span className="text-ink-light">{(e.confidence ?? 0).toFixed(2)}</span>
              </span>
              <span>
                seen <span className="text-ink-light">{fmtRelativeDate(e.observed_at)}</span>
              </span>
              {isArticle && articleTitle && (
                <span className="basis-full text-ink-light-muted truncate">
                  via: <span className="text-ink-light">{articleTitle}</span>
                </span>
              )}
              {articleUrl && (
                <a
                  href={articleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-lime hover:text-accent-lime-bright"
                >
                  source ↗
                </a>
              )}
              {!articleUrl && e.article_id && (
                <span className="text-ink-light-muted break-all">
                  art: <span className="text-ink-light">{e.article_id.slice(-12)}</span>
                </span>
              )}
            </div>
          </div>
        );
      })}

      {edges.length > EDGE_PREVIEW_LIMIT && (
        <button
          onClick={onToggleShowAll}
          className="w-full font-mono text-label-sm uppercase tracking-widest text-ink-light-muted hover:text-accent-lime py-2 transition-colors"
        >
          {showAll ? `▴ collapse to ${EDGE_PREVIEW_LIMIT}` : `▾ show all ${edges.length}`}
        </button>
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

function EdgePanel({ edge, allNodes }: { edge: GraphEdge; allNodes?: GraphNode[] }) {
  const map = new Map<string, GraphNode>();
  if (allNodes) for (const n of allNodes) map.set(n.id, n);
  const src = map.get(edge.src_id);
  const dst = map.get(edge.dst_id);

  return (
    <div className="p-4">
      <div className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted mb-3">
        ▶ RELATIONSHIP
      </div>
      <div className="mb-4 border border-ink-light/10 px-3 py-3">
        <div className="font-mono text-label-sm text-ink-light leading-relaxed">
          <span className="text-ink-light">{src?.label ?? edge.src_id}</span>
          {src?.type && (
            <span className="ml-2 text-ink-light-muted uppercase tracking-widest text-[10px]">
              {src.type}
            </span>
          )}
        </div>
        <div className="font-mono text-label-sm text-accent-lime uppercase tracking-widest my-1.5">
          ↓ {edge.type}
        </div>
        <div className="font-mono text-label-sm text-ink-light leading-relaxed">
          <span className="text-ink-light">{dst?.label ?? edge.dst_id}</span>
          {dst?.type && (
            <span className="ml-2 text-ink-light-muted uppercase tracking-widest text-[10px]">
              {dst.type}
            </span>
          )}
        </div>
      </div>

      <div className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted mb-2">
        ▶ WHY (evidence)
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
