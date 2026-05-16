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

const API_BASE = "/api/_back";

function backUrl(path: string): string {
  const stripped = path.startsWith("/api/") ? path.slice(4) : path;
  return `${API_BASE}${stripped.startsWith("/") ? stripped : "/" + stripped}`;
}

export async function fetchNews(opts: { limit?: number; force?: boolean } = {}): Promise<NewsResponse> {
  const params = new URLSearchParams();
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.force) params.set("force", "1");
  const url = backUrl(`/api/news${params.toString() ? `?${params}` : ""}`);
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
  const res = await fetch(backUrl(`/api/news/status`), { cache: "no-store" });
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
  const res = await fetch(backUrl(`/api/agent/status`), { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchAgentStatus failed: ${res.status}`);
  return res.json();
}

export async function fetchAgentLog(limit = 20): Promise<{ events: AgentActivityEvent[] }> {
  const res = await fetch(backUrl(`/api/agent/log?limit=${limit}`), { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchAgentLog failed: ${res.status}`);
  return res.json();
}

export async function triggerAgentRun(): Promise<AgentRunResult> {
  const res = await fetch(backUrl(`/api/agent/run`), {
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
  tg_alerts: number;
  tg_briefs: number;
}

export async function updateCommissionSubscriptions(
  id: string,
  patch: { tg_alerts?: boolean; tg_briefs?: boolean },
): Promise<{ commission: Commission }> {
  return jsonFetch(`/api/commissions/${id}/subscriptions`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
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

function getWalletHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const w = window.localStorage.getItem("og-wallet-address");
    return w ? { "X-Wallet-Address": w } : {};
  } catch {
    return {};
  }
}

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(backUrl(path), {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...getWalletHeader(),
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((body as { error?: string }).error ?? `${path} failed: ${res.status}`);
    (err as Error & { status?: number; body?: unknown }).status = res.status;
    (err as Error & { status?: number; body?: unknown }).body = body;
    throw err;
  }
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

export interface CommissionBatchResult {
  commissionId: string;
  processed: number;
  totalEntities: number;
  totalEdges: number;
  durationMs: number;
  errors: string[];
  status: "ok" | "no_coverage";
  message?: string;
  source: "cache" | "targeted" | "none";
}

export async function runCommission(id: string, limit?: number): Promise<CommissionBatchResult> {
  const qs = limit ? `?limit=${limit}` : "";
  return jsonFetch(`/api/commissions/${id}/run${qs}`, { method: "POST" });
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

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  answer: string;
  trace_id: string | null;
  model: string;
  context: { entities: number; edges: number; briefs: number; uploads: number };
}

export async function chatWithCommission(
  commissionId: string,
  message: string,
  history: ChatTurn[],
): Promise<ChatResponse> {
  return jsonFetch(`/api/commissions/${commissionId}/chat`, {
    method: "POST",
    body: JSON.stringify({ message, history }),
  });
}

export interface VaultBrief {
  id: number;
  commission_id: string;
  commission_query: string;
  article_id: string | null;
  storage_hash: string | null;
  trace_id: string | null;
  created_at: number;
  body_excerpt: string;
}

export interface VaultUpload {
  id: string;
  commission_id: string;
  commission_query: string;
  filename: string;
  size: number;
  content_sha256: string;
  storage_uri: string | null;
  rows_total: number;
  rows_processed: number;
  entities_added: number;
  edges_added: number;
  status: string;
  created_at: number;
}

export interface VaultPayload {
  briefs: VaultBrief[];
  uploads: VaultUpload[];
  stats: {
    briefs_total: number;
    briefs_anchored: number;
    uploads_total: number;
    uploads_anchored: number;
    bytes_total: number;
  };
  flags: { OG_STORAGE_ENABLED: boolean };
}

export async function fetchVault(commissionId?: string): Promise<VaultPayload> {
  const qs = commissionId ? `?commission=${encodeURIComponent(commissionId)}` : "";
  return jsonFetch(`/api/vault${qs}`);
}

export interface Brief {
  id: number;
  commission_id: string;
  article_id: string | null;
  body_md: string;
  trace_id: string | null;
  created_at: number;
}

export async function fetchBriefs(commissionId: string, limit = 20): Promise<{ briefs: Brief[] }> {
  return jsonFetch(`/api/commissions/${commissionId}/briefs?limit=${limit}`);
}

export interface DigestPayload {
  commission_id: string;
  query_text: string;
  since: number;
  brief_count: number;
  briefs: Brief[];
  new_entities: { id: string; type: string; name: string }[];
  new_edges_count: number;
  top_sources: { name: string; count: number }[];
  markdown: string;
}

export async function fetchDigest(commissionId: string, sinceMs?: number): Promise<DigestPayload> {
  const qs = sinceMs ? `?since=${sinceMs}` : "";
  return jsonFetch(`/api/commissions/${commissionId}/digest${qs}`);
}

export type SourceKind = "rss" | "youtube";

export interface Source {
  id: number;
  commission_id: string;
  kind: SourceKind;
  url: string;
  label: string | null;
  preference: number;
  active: number;
  last_fetched_at: number | null;
  last_item_count: number | null;
  last_error: string | null;
  created_at: number;
}

export async function listSources(commissionId: string): Promise<{ sources: Source[] }> {
  return jsonFetch(`/api/sources/${commissionId}`);
}

export async function createSource(commissionId: string, kind: SourceKind, url: string, label?: string): Promise<{ source: Source }> {
  return jsonFetch(`/api/sources/${commissionId}`, {
    method: "POST",
    body: JSON.stringify({ kind, url, label }),
  });
}

export async function patchSource(commissionId: string, sourceId: number, patch: Partial<{ active: number; preference: number; label: string | null }>): Promise<{ source: Source }> {
  return jsonFetch(`/api/sources/${commissionId}/${sourceId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteSource(commissionId: string, sourceId: number): Promise<{ ok: true }> {
  return jsonFetch(`/api/sources/${commissionId}/${sourceId}`, { method: "DELETE" });
}

export interface TelegramChannel {
  id: number;
  owner_id: string;
  kind: "telegram";
  target: string;
  active: number;
  created_at: number;
}

export async function getTelegramChannel(): Promise<{ channel: TelegramChannel | null }> {
  return jsonFetch(`/api/integrations/telegram`);
}

export async function saveTelegramChannel(chatId: string): Promise<{ channel: TelegramChannel }> {
  return jsonFetch(`/api/integrations/telegram`, {
    method: "POST",
    body: JSON.stringify({ chat_id: chatId }),
  });
}

export async function testTelegramChannel(): Promise<{ ok: boolean; reason?: string; telegram?: unknown }> {
  return jsonFetch(`/api/integrations/telegram/test`, { method: "POST" });
}

export async function deleteTelegramChannel(): Promise<{ ok: true }> {
  return jsonFetch(`/api/integrations/telegram`, { method: "DELETE" });
}

export type AlertKind = "entity_mentioned" | "edge_type_added" | "keyword_in_evidence" | "sentiment_drop";

export interface AlertRule {
  id: number;
  commission_id: string;
  kind: AlertKind;
  config: string;
  channel_ids: string;
  active: number;
  cooldown_seconds: number;
  last_fired_at: number | null;
  created_at: number;
}

export interface AlertEvent {
  id: number;
  rule_id: number;
  payload: string;
  delivered_to: string | null;
  created_at: number;
  kind?: AlertKind;
}

export async function listAlertRules(commissionId: string): Promise<{ rules: AlertRule[] }> {
  return jsonFetch(`/api/alerts/${commissionId}`);
}

export async function createAlertRule(commissionId: string, kind: AlertKind, config: Record<string, unknown>, cooldownSeconds?: number): Promise<{ rule: AlertRule }> {
  return jsonFetch(`/api/alerts/${commissionId}`, {
    method: "POST",
    body: JSON.stringify({ kind, config, cooldown_seconds: cooldownSeconds }),
  });
}

export async function patchAlertRule(commissionId: string, ruleId: number, patch: Partial<{ active: number; cooldown_seconds: number; config: Record<string, unknown> }>): Promise<{ rule: AlertRule }> {
  return jsonFetch(`/api/alerts/${commissionId}/${ruleId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteAlertRule(commissionId: string, ruleId: number): Promise<{ ok: true }> {
  return jsonFetch(`/api/alerts/${commissionId}/${ruleId}`, { method: "DELETE" });
}

export async function listAlertEvents(commissionId: string, limit = 30): Promise<{ events: AlertEvent[] }> {
  return jsonFetch(`/api/alerts/${commissionId}/events?limit=${limit}`);
}

export interface SevenDayBrief {
  commission_id: string;
  query_text: string;
  since: number;
  brief_count: number;
  new_entities?: number;
  new_edges?: number;
  summary: string;
  trace_id?: string | null;
}

export async function fetchSevenDayBrief(commissionId: string): Promise<SevenDayBrief> {
  return jsonFetch(`/api/commissions/${commissionId}/brief-7d`);
}

export interface AuditEvent {
  ts: number;
  kind: string;
  related_id: string | null;
  summary: string | null;
  trace_id: string | null;
  commission_id: string | null;
}

export interface AuditFeed {
  events: AuditEvent[];
  counts: Record<string, number>;
  totals: { inference_cost_wei: string };
  flags: { PAYMENT_ENABLED: boolean; OG_STORAGE_ENABLED: boolean; OG_CHAIN_ENABLED: boolean };
  inference: { available: boolean; model: string };
}

export async function fetchAuditFeed(limit = 100): Promise<AuditFeed> {
  return jsonFetch(`/api/agent/audit?limit=${limit}`);
}

export interface UploadRow {
  id: string;
  commission_id: string;
  filename: string;
  mime: string | null;
  size: number;
  content_sha256: string;
  storage_uri: string | null;
  rows_total: number;
  rows_processed: number;
  entities_added: number;
  edges_added: number;
  status: "pending" | "processing" | "completed" | "partial" | "failed";
  error: string | null;
  created_at: number;
}

export async function listUploads(commissionId: string): Promise<{ uploads: UploadRow[] }> {
  return jsonFetch(`/api/uploads/${commissionId}`);
}

export async function getUpload(commissionId: string, uploadId: string): Promise<{ upload: UploadRow }> {
  return jsonFetch(`/api/uploads/${commissionId}/${uploadId}`);
}

export interface UploadStartResponse {
  upload_id: string;
  sha256: string;
  storage_uri: string;
  rows_total: number;
  status: string;
}

export async function uploadCsv(commissionId: string, file: File): Promise<UploadStartResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(backUrl(`/api/uploads/${commissionId}`), {
    method: "POST",
    headers: { ...getWalletHeader() },
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((body as { error?: string }).error ?? `upload failed: ${res.status}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return body as UploadStartResponse;
}
