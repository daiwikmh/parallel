"use client";
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import dynamic from "next/dynamic";
import type { GraphPayload, GraphNode, GraphEdge, EntityKind } from "@/lib/api";

const ForceGraph2D = dynamic(
  () => import("react-force-graph-2d").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center text-ink-light-muted font-mono text-label-sm">
        ▶ initializing graph…
      </div>
    ),
  },
) as unknown as ComponentType<Record<string, unknown>>;

interface Props {
  graph: GraphPayload;
  selectedNodeId: string | null;
  selectedEdgeId: number | null;
  onNodeClick: (node: GraphNode) => void;
  onEdgeClick: (edge: GraphEdge) => void;
  onBackgroundClick: () => void;
}

const TYPE_COLORS: Record<EntityKind, string> = {
  token: "#bef264",
  protocol: "#7dd3fc",
  company: "#fde68a",
  person: "#fb923c",
  jurisdiction: "#f87171",
  event: "#e5e7eb",
  topic: "#a3a3a3",
};

type ForceNode = GraphNode & { x?: number; y?: number; fx?: number; fy?: number };
type ForceLink = { source: string | ForceNode; target: string | ForceNode; edge: GraphEdge };

export function GraphView({
  graph,
  selectedNodeId,
  selectedEdgeId,
  onNodeClick,
  onEdgeClick,
  onBackgroundClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const nodeCacheRef = useRef<Map<string, ForceNode>>(new Map());

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.max(1, Math.floor(r.width)), h: Math.max(1, Math.floor(r.height)) });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const data = useMemo(() => {
    const cache = nodeCacheRef.current;
    const seen = new Set<string>();
    const nodes: ForceNode[] = graph.nodes.map((n) => {
      seen.add(n.id);
      const existing = cache.get(n.id);
      if (existing) {
        existing.label = n.label;
        existing.type = n.type;
        existing.edge_count = n.edge_count;
        return existing;
      }
      const fresh: ForceNode = { ...n };
      cache.set(n.id, fresh);
      return fresh;
    });
    for (const id of cache.keys()) {
      if (!seen.has(id)) cache.delete(id);
    }
    const links: ForceLink[] = graph.edges.map((e) => ({
      source: e.src_id,
      target: e.dst_id,
      edge: e,
    }));
    return { nodes, links };
  }, [graph]);

  const lastFitCountRef = useRef(0);
  useEffect(() => {
    if (!graphRef.current || data.nodes.length === 0) return;
    if (data.nodes.length === lastFitCountRef.current) return;
    lastFitCountRef.current = data.nodes.length;
    const t = setTimeout(() => {
      try {
        graphRef.current?.zoomToFit(600, 80);
      } catch {
        /* ignore */
      }
    }, 600);
    return () => clearTimeout(t);
  }, [data.nodes.length]);

  useEffect(() => {
    if (!graphRef.current) return;
    try {
      const charge = graphRef.current.d3Force?.("charge");
      if (charge && typeof charge.strength === "function") charge.strength(-180);
      const link = graphRef.current.d3Force?.("link");
      if (link && typeof link.distance === "function") link.distance(70);
      graphRef.current.d3ReheatSimulation?.();
    } catch {
      /* ignore */
    }
  }, [data.nodes.length]);

  if (graph.nodes.length === 0) {
    return (
      <div ref={containerRef} className="relative h-full w-full overflow-hidden flex flex-col items-center justify-center text-ink-light-muted font-mono text-label-sm gap-2">
        <div>▶ NO NODES YET</div>
        <div className="text-xs">Run the agent on this commission to populate edges.</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden" onClick={onBackgroundClick}>
      <ForceGraph2D
        ref={graphRef}
        width={size.w}
        height={size.h}
        graphData={data}
        backgroundColor="rgba(0,0,0,0)"
        nodeLabel={(n: ForceNode) => `${n.label} (${n.type})`}
        nodeRelSize={6}
        nodeVal={(n: ForceNode) => 1 + Math.min(8, n.edge_count)}
        nodeCanvasObject={(node: ForceNode, ctx: CanvasRenderingContext2D, scale: number) => {
          const r = 4 + Math.min(6, node.edge_count) * 0.6;
          ctx.beginPath();
          ctx.arc(node.x!, node.y!, r, 0, 2 * Math.PI);
          ctx.fillStyle = TYPE_COLORS[node.type] ?? "#cccccc";
          ctx.fill();
          if (node.id === selectedNodeId) {
            ctx.lineWidth = 2 / scale;
            ctx.strokeStyle = "#ffffff";
            ctx.stroke();
          }
          const label = node.label;
          const fontSize = Math.max(8, 11 / scale);
          ctx.font = `${fontSize}px ui-monospace, monospace`;
          ctx.fillStyle = "#e5e7eb";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(label, node.x!, node.y! + r + 2);
        }}
        nodePointerAreaPaint={(node: ForceNode, color: string, ctx: CanvasRenderingContext2D) => {
          const r = 8 + Math.min(6, node.edge_count) * 0.6;
          ctx.beginPath();
          ctx.arc(node.x!, node.y!, r, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        }}
        linkLabel={(l: ForceLink) => l.edge.type}
        linkColor={(l: ForceLink) => (l.edge.id === selectedEdgeId ? "#bef264" : "rgba(255,255,255,0.25)")}
        linkWidth={(l: ForceLink) => (l.edge.id === selectedEdgeId ? 2 : 1)}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={0.85}
        linkCanvasObjectMode={() => "after"}
        linkCanvasObject={(link: ForceLink, ctx: CanvasRenderingContext2D, scale: number) => {
          const src = link.source as ForceNode;
          const tgt = link.target as ForceNode;
          if (!src.x || !tgt.x) return;
          const mx = (src.x + tgt.x) / 2;
          const my = (src.y! + tgt.y!) / 2;
          const fontSize = Math.max(7, 9 / scale);
          ctx.font = `${fontSize}px ui-monospace, monospace`;
          ctx.fillStyle = link.edge.id === selectedEdgeId ? "#bef264" : "rgba(255,255,255,0.45)";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(link.edge.type, mx, my);
        }}
        onNodeClick={(n: unknown) => {
          onNodeClick(n as GraphNode);
        }}
        onLinkClick={(l: unknown) => {
          onEdgeClick((l as ForceLink).edge);
        }}
        onBackgroundClick={onBackgroundClick}
        cooldownTicks={300}
        d3AlphaDecay={0.012}
        d3VelocityDecay={0.35}
        warmupTicks={20}
      />
    </div>
  );
}
