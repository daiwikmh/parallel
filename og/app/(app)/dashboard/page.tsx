"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  listCommissions,
  fetchGraph,
  runCommission,
  dropCommission,
  type Commission,
  type Classification,
  type GraphPayload,
  type GraphNode,
  type GraphEdge,
} from "@/lib/api";
import { CommissionInput } from "@/components/commission/CommissionInput";
import { CommissionsList } from "@/components/commission/CommissionsList";
import { GraphView } from "@/components/graph/GraphView";
import { ContextPanel } from "@/components/graph/ContextPanel";
import { Timeline } from "@/components/graph/Timeline";

const PANEL_STORAGE_KEY = "dash-panels-v1";

interface PanelState {
  left: boolean;
  right: boolean;
  timeline: boolean;
}

const DEFAULT_PANELS: PanelState = { left: true, right: true, timeline: true };

function loadPanelState(): PanelState {
  if (typeof window === "undefined") return DEFAULT_PANELS;
  try {
    const raw = window.localStorage.getItem(PANEL_STORAGE_KEY);
    if (!raw) return DEFAULT_PANELS;
    return { ...DEFAULT_PANELS, ...(JSON.parse(raw) as Partial<PanelState>) };
  } catch {
    return DEFAULT_PANELS;
  }
}

export default function DashboardPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [selectedCommissionId, setSelectedCommissionId] = useState<string | null>(null);
  const [graph, setGraph] = useState<GraphPayload>({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [runInfo, setRunInfo] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panels, setPanels] = useState<PanelState>(DEFAULT_PANELS);

  useEffect(() => {
    setPanels(loadPanelState());
  }, []);

  const togglePanel = useCallback((key: keyof PanelState) => {
    setPanels((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const loadCommissions = useCallback(async (preferSelect?: string) => {
    try {
      const { commissions: list } = await listCommissions();
      setCommissions(list);
      setLoadError(null);
      if (preferSelect) {
        setSelectedCommissionId(preferSelect);
      } else if (!selectedCommissionId && list.length > 0) {
        setSelectedCommissionId(list[0].id);
      }
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, [selectedCommissionId]);

  const loadGraph = useCallback(async (commissionId: string) => {
    try {
      const g = await fetchGraph(commissionId);
      setGraph(g);
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    loadCommissions();
    const id = setInterval(() => loadCommissions(), 10_000);
    return () => clearInterval(id);
  }, [loadCommissions]);

  const lastInitializedRef = useRef<string | null>(null);
  const commissionsRef = useRef(commissions);
  commissionsRef.current = commissions;

  useEffect(() => {
    if (!selectedCommissionId) {
      setGraph({ nodes: [], edges: [] });
      lastInitializedRef.current = null;
      return;
    }
    const isNew = lastInitializedRef.current !== selectedCommissionId;
    lastInitializedRef.current = selectedCommissionId;
    if (isNew) {
      setSelectedNode(null);
      setSelectedEdge(null);
    }
    loadGraph(selectedCommissionId);
    const id = setInterval(() => loadGraph(selectedCommissionId), 10_000);
    return () => clearInterval(id);
  }, [selectedCommissionId, loadGraph]);

  useEffect(() => {
    if (!selectedCommissionId || selectedNode || selectedEdge) return;
    const commission = commissionsRef.current.find((c) => c.id === selectedCommissionId);
    if (!commission?.entity_id) return;
    const seed = graph.nodes.find((n) => n.id === commission.entity_id);
    if (seed) setSelectedNode(seed);
  }, [graph, selectedCommissionId, selectedNode, selectedEdge]);

  const handleCreated = useCallback(
    (c: Commission, _cls: Classification) => {
      loadCommissions(c.id);
    },
    [loadCommissions],
  );

  const handleDrop = useCallback(
    async (id: string) => {
      try {
        await dropCommission(id);
        if (id === selectedCommissionId) setSelectedCommissionId(null);
        await loadCommissions();
      } catch (e) {
        setLoadError((e as Error).message);
      }
    },
    [selectedCommissionId, loadCommissions],
  );

  const handleRun = useCallback(async () => {
    if (!selectedCommissionId || running) return;
    setRunning(true);
    setRunError(null);
    setRunInfo(null);
    try {
      const result = await runCommission(selectedCommissionId);
      if (result.status === "no_coverage") {
        setRunInfo(result.message ?? "No current news coverage found.");
      } else {
        const src = result.source === "targeted" ? " · targeted search" : "";
        setRunInfo(
          `Processed ${result.processed} article${result.processed === 1 ? "" : "s"} · ${result.totalEntities} entities · ${result.totalEdges} edges${src}`,
        );
      }
      await loadGraph(selectedCommissionId);
    } catch (e) {
      setRunError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }, [selectedCommissionId, running, loadGraph]);

  const selectedCommission = commissions.find((c) => c.id === selectedCommissionId) ?? null;

  return (
    <main className="min-h-screen bg-bg-dark text-ink-light">
      <div className="pt-8 pb-24 px-6 md:px-8 max-w-7xl">
        <div className="mb-2">
          <span className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted">
            ▶ DASHBOARD
          </span>
        </div>
        <h1 className="font-display font-bold text-h1 mb-8">Commission a topic.</h1>

        {loadError && (
          <div className="border border-accent-orange/60 bg-accent-orange/10 px-4 py-3 mb-6 font-mono text-label-sm">
            ▶ {loadError}
          </div>
        )}

        <CommissionInput onCreated={handleCreated} />

        {commissions.length === 0 ? (
          <div className="border border-ink-light/10 px-6 py-12 text-center font-mono text-label-sm text-ink-light-muted">
            No active commissions. Type a topic above to start your first one.
          </div>
        ) : (
          <>
            <div className={gridClass(panels)}>
              {panels.left ? (
                <div className="lg:col-span-3">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted">
                      ▶ TOPICS
                    </span>
                    <button
                      onClick={() => togglePanel("left")}
                      className="font-mono text-label-sm text-ink-light-muted hover:text-accent-lime transition-colors"
                      title="Collapse topics"
                    >
                      ◀
                    </button>
                  </div>
                  <CommissionsList
                    commissions={commissions}
                    selectedId={selectedCommissionId}
                    onSelect={setSelectedCommissionId}
                    onDrop={handleDrop}
                  />
                  {selectedCommission && (
                    <div className="mt-4 space-y-2">
                      <button
                        onClick={handleRun}
                        disabled={running}
                        className="w-full px-4 py-2 border border-accent-lime/60 text-accent-lime font-mono text-label-sm uppercase tracking-widest hover:bg-accent-lime/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {running ? "▶ RUNNING…" : "▸ RUN NOW"}
                      </button>
                      {runError && (
                        <div className="border border-accent-orange/60 bg-accent-orange/10 px-3 py-2 font-mono text-label-sm text-accent-orange">
                          ▶ {runError}
                        </div>
                      )}
                      {runInfo && (
                        <div className="border border-ink-light/10 bg-bg-dark-2/50 px-3 py-2 font-mono text-label-sm text-ink-light-muted">
                          ▶ {runInfo}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <CollapsedRail
                  side="left"
                  label="TOPICS"
                  onExpand={() => togglePanel("left")}
                />
              )}

              <div className={graphColSpanClass(panels)}>
                <div className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted mb-3 flex items-center justify-between">
                  <span>▶ GRAPH</span>
                  {selectedCommission && (
                    <span className="normal-case tracking-normal text-ink-light-muted">
                      {graph.nodes.length} nodes · {graph.edges.length} edges
                    </span>
                  )}
                </div>
                <div className="border border-ink-light/10 bg-bg-dark-2/30 h-[480px]">
                  {selectedCommissionId ? (
                    <GraphView
                      graph={graph}
                      selectedNodeId={selectedNode?.id ?? null}
                      selectedEdgeId={selectedEdge?.id ?? null}
                      onNodeClick={(n) => {
                        setSelectedNode(n);
                        setSelectedEdge(null);
                      }}
                      onEdgeClick={(e) => {
                        setSelectedEdge(e);
                        setSelectedNode(null);
                      }}
                      onBackgroundClick={() => {
                        setSelectedNode(null);
                        setSelectedEdge(null);
                      }}
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center font-mono text-label-sm text-ink-light-muted">
                      ▶ select a commission
                    </div>
                  )}
                </div>
              </div>

              {panels.right ? (
                <div className="lg:col-span-3">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={() => togglePanel("right")}
                      className="font-mono text-label-sm text-ink-light-muted hover:text-accent-lime transition-colors"
                      title="Collapse entity panel"
                    >
                      ▶
                    </button>
                    <span className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted">
                      ENTITY ◀
                    </span>
                  </div>
                  <div className="border border-ink-light/10 min-h-[480px] bg-bg-dark-2/30">
                    <ContextPanel
                      selectedNode={selectedNode}
                      selectedEdge={selectedEdge}
                      activeCommissions={commissions}
                      onCommissionCreated={handleCreated}
                    />
                  </div>
                </div>
              ) : (
                <CollapsedRail
                  side="right"
                  label="ENTITY"
                  onExpand={() => togglePanel("right")}
                />
              )}
            </div>

            <div className="mt-2 mb-3 flex items-center gap-3">
              <button
                onClick={() => togglePanel("timeline")}
                className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted hover:text-accent-lime transition-colors"
              >
                {panels.timeline ? "− hide timeline" : "+ show timeline"}
              </button>
            </div>

            {panels.timeline && (
              <Timeline
                edges={graph.edges}
                onEdgeClick={(e) => {
                  setSelectedEdge(e);
                  setSelectedNode(null);
                }}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}

function gridClass(p: PanelState): string {
  return "grid grid-cols-1 lg:grid-cols-12 gap-6 mb-4";
}

function graphColSpanClass(p: PanelState): string {
  if (p.left && p.right) return "lg:col-span-6";
  if (p.left || p.right) return "lg:col-span-9";
  return "lg:col-span-12";
}

interface CollapsedRailProps {
  side: "left" | "right";
  label: string;
  onExpand: () => void;
}

function CollapsedRail({ side, label, onExpand }: CollapsedRailProps) {
  return (
    <div className="hidden lg:flex lg:col-span-1">
      <button
        onClick={onExpand}
        className="w-full min-h-[120px] border border-ink-light/10 bg-bg-dark-2/30 hover:bg-bg-dark-2/60 hover:border-accent-lime/40 transition-colors flex flex-col items-center justify-center gap-2 font-mono text-label-sm uppercase tracking-widest text-ink-light-muted hover:text-accent-lime"
        title={`Expand ${label.toLowerCase()}`}
      >
        <span>{side === "left" ? "▶" : "◀"}</span>
        <span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
          {label}
        </span>
      </button>
    </div>
  );
}
