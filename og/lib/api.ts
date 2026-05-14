export interface NewsSignals {
  upvotes?: number;
  comments?: number;
  stars?: number;
}

export type NewsSourceKind =
  | "rss"
  | "hackernews"
  | "reddit"
  | "github"
  | "googleNews"
  | "twitter";

export interface NewsSource {
  kind: NewsSourceKind;
  name: string;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  source: NewsSource;
  score?: number;
  signals?: NewsSignals;
}

export interface ProviderStatus {
  provider: string;
  kind: NewsSourceKind;
  ok: boolean;
  count: number;
  error?: string;
}

export interface NewsResponse {
  cachedAt: number;
  ageMs: number;
  total: number;
  providers: ProviderStatus[];
  items: NewsItem[];
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

export async function fetchNews(opts: { limit?: number; force?: boolean } = {}): Promise<NewsResponse> {
  const params = new URLSearchParams();
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.force) params.set("force", "1");
  const url = `${API_BASE}/api/news${params.toString() ? `?${params}` : ""}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchNews failed: ${res.status}`);
  return res.json();
}

export interface StatusResponse {
  cachedAt: number;
  ageMs: number;
  total: number;
  providers: ProviderStatus[];
}

export async function fetchNewsStatus(): Promise<StatusResponse> {
  const res = await fetch(`${API_BASE}/api/news/status`, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchNewsStatus failed: ${res.status}`);
  return res.json();
}

export interface Entity {
  name: string;
  type: "person" | "organization" | "technology" | "event" | "place";
  description?: string;
}

export interface EditorialResult {
  editorial: string;
  illustrationPrompt: string;
  entities: Entity[];
}

export interface AgentRunResult {
  pickedItem: NewsItem;
  editorial: EditorialResult;
  model: string;
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
  startedAt: number;
  finishedAt: number;
  durationMs: number;
}

export interface AgentStatusResponse {
  inference: { available: boolean; model: string };
  running: boolean;
  lastResult: AgentRunResult | null;
}

export interface AgentActivityEvent {
  timestamp: number;
  action: "SCAN" | "PICK" | "WRITE" | "DONE" | "ERROR";
  detail: string;
}

export async function fetchAgentStatus(): Promise<AgentStatusResponse> {
  const res = await fetch(`${API_BASE}/api/agent/status`, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchAgentStatus failed: ${res.status}`);
  return res.json();
}

export async function fetchAgentLog(limit = 20): Promise<{ events: AgentActivityEvent[] }> {
  const res = await fetch(`${API_BASE}/api/agent/log?limit=${limit}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchAgentLog failed: ${res.status}`);
  return res.json();
}

export async function triggerAgentRun(): Promise<AgentRunResult> {
  const res = await fetch(`${API_BASE}/api/agent/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as { error?: string }).error ?? `triggerAgentRun failed: ${res.status}`);
  }
  return body as AgentRunResult;
}

export type EntityKind =
  | "token"
  | "protocol"
  | "company"
  | "person"
  | "jurisdiction"
  | "event"
  | "topic";

export type EdgeKind =
  | "founded" | "works_at" | "partners_with" | "invests_in" | "regulates"
  | "built_on" | "competes_with" | "mentions" | "affects"
  | "holds_treasury_in" | "audited_by" | "exploited"
  | "merged_into" | "forked_from" | "announced" | "denied";

export interface Commission {
  id: string;
  owner_id: string;
  query_text: string;
  entity_id: string | null;
  entity_type: EntityKind | null;
  thesis: string | null;
  status: "active" | "paused" | "dropped";
  created_at: number;
  paused_at: number | null;
  dropped_at: number | null;
}

export interface Classification {
  type: EntityKind;
  canonical_id: string;
  canonical_name: string;
  aliases: string[];
  confidence: number;
}

export interface GraphNode {
  id: string;
  type: EntityKind;
  label: string;
  edge_count: number;
}

export interface GraphEdge {
  id: number;
  src_id: string;
  dst_id: string;
  type: EdgeKind;
  evidence: string | null;
  observed_at: number;
  confidence: number;
  article_id: string | null;
}

export interface GraphPayload {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface EntityDetail {
  entity: {
    id: string;
    type: EntityKind;
    canonical_name: string;
    aliases: string[];
    attributes: Record<string, unknown>;
  };
  edges: Array<GraphEdge & { properties: Record<string, unknown> }>;
}

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `${path} failed: ${res.status}`);
  return body as T;
}

export async function createCommission(query: string, thesis?: string): Promise<{ commission: Commission; classification: Classification }> {
  return jsonFetch(`/api/commissions`, {
    method: "POST",
    body: JSON.stringify({ query, thesis }),
  });
}

export async function listCommissions(): Promise<{ commissions: Commission[] }> {
  return jsonFetch(`/api/commissions`);
}

export async function runCommission(id: string): Promise<AgentRunResult & { graph: { entities: number; edges: number }; commissionId?: string }> {
  return jsonFetch(`/api/commissions/${id}/run`, { method: "POST" });
}

export async function dropCommission(id: string): Promise<{ ok: true }> {
  return jsonFetch(`/api/commissions/${id}`, { method: "DELETE" });
}

export async function fetchGraph(commission: string, since?: number): Promise<GraphPayload> {
  const qs = new URLSearchParams({ commission });
  if (since !== undefined) qs.set("since", String(since));
  return jsonFetch(`/api/graph?${qs}`);
}

export async function fetchEntity(id: string): Promise<EntityDetail> {
  return jsonFetch(`/api/graph/entities/${encodeURIComponent(id)}`);
}
