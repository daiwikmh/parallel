import { db, now } from './client'
import type {
  EntityRow,
  EdgeRow,
  ArticleRow,
  CommissionRow,
  TraceRow,
  EntityKind,
  EdgeKind,
} from '../lib/types/graph-db.types'
import type { ExtractedEntity, ExtractedEdge } from '../agent/extract'
import type { NewsItem } from '../lib/types'
import type { OgTrace } from '../og/compute'

export interface UpsertEntityInput {
  canonical_id: string
  type: EntityKind
  name: string
  aliases?: string[]
  attributes?: Record<string, unknown>
}

export function upsertEntity(input: UpsertEntityInput): EntityRow {
  const t = now()
  const candidates = aliasCandidates(input.canonical_id, input.name, input.aliases)
  const resolvedId = resolveCanonicalId(input.canonical_id, candidates)
  const existing = db.query<EntityRow, [string]>(`SELECT * FROM entities WHERE id = ?`).get(resolvedId)
  if (existing) {
    const mergedAliases = mergeAliases(
      JSON.parse(existing.aliases) as string[],
      input.aliases ?? [],
      input.name,
      existing.canonical_name,
    )
    const existingAttrs = (() => {
      try { return JSON.parse(existing.attributes) as Record<string, unknown> } catch { return {} }
    })()
    const mergedAttrs = { ...existingAttrs, ...(input.attributes ?? {}) }
    db.query(`UPDATE entities SET aliases = ?, attributes = ?, updated_at = ? WHERE id = ?`).run(
      JSON.stringify(mergedAliases),
      JSON.stringify(mergedAttrs),
      t,
      existing.id,
    )
    indexAliases(existing.id, mergedAliases.concat(existing.canonical_name))
    return { ...existing, aliases: JSON.stringify(mergedAliases), attributes: JSON.stringify(mergedAttrs), updated_at: t }
  }
  const aliases = input.aliases ?? []
  db.query(
    `INSERT INTO entities (id, type, canonical_name, aliases, attributes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    resolvedId,
    input.type,
    input.name,
    JSON.stringify(aliases),
    JSON.stringify(input.attributes ?? {}),
    t,
    t,
  )
  indexAliases(resolvedId, aliases.concat(input.name))
  return {
    id: resolvedId,
    type: input.type,
    canonical_name: input.name,
    aliases: JSON.stringify(aliases),
    attributes: JSON.stringify(input.attributes ?? {}),
    created_at: t,
    updated_at: t,
  }
}

function aliasCandidates(canonicalId: string, name: string, aliases?: string[]): string[] {
  const out = new Set<string>()
  out.add(name.toLowerCase().trim())
  for (const a of aliases ?? []) out.add(a.toLowerCase().trim())
  const colonIdx = canonicalId.indexOf(':')
  if (colonIdx >= 0) out.add(canonicalId.slice(colonIdx + 1).toLowerCase().trim())
  out.delete('')
  return Array.from(out)
}

function resolveCanonicalId(canonicalId: string, candidates: string[]): string {
  if (candidates.length === 0) return canonicalId
  const placeholders = candidates.map(() => '?').join(',')
  const hit = db
    .query<{ entity_id: string }, string[]>(
      `SELECT entity_id FROM entity_aliases WHERE alias_lower IN (${placeholders}) LIMIT 1`,
    )
    .get(...candidates)
  return hit?.entity_id ?? canonicalId
}

function indexAliases(entityId: string, terms: string[]): void {
  const t = now()
  const stmt = db.query(
    `INSERT OR IGNORE INTO entity_aliases (alias_lower, entity_id, created_at) VALUES (?, ?, ?)`,
  )
  for (const raw of terms) {
    const lower = raw.toLowerCase().trim()
    if (!lower) continue
    stmt.run(lower, entityId, t)
  }
}

function mergeAliases(existing: string[], incoming: string[], incomingName: string, existingName: string): string[] {
  const set = new Set(existing.map((a) => a.toLowerCase()))
  set.add(existingName.toLowerCase())
  for (const a of incoming) set.add(a.toLowerCase())
  if (incomingName && incomingName.toLowerCase() !== existingName.toLowerCase()) set.add(incomingName.toLowerCase())
  set.delete(existingName.toLowerCase())
  return Array.from(set)
}

export interface InsertEdgeInput {
  src_id: string
  dst_id: string
  type: EdgeKind
  observed_at: number
  effective_at?: number | null
  properties?: Record<string, unknown>
  evidence?: string | null
  article_id?: string | null
  trace_id?: string | null
  confidence?: number
  commission_id?: string | null
}

export function insertEdge(input: InsertEdgeInput): number {
  const t = now()
  const result = db
    .query(
      `INSERT INTO edges (src_id, dst_id, type, observed_at, effective_at, properties, evidence, article_id, trace_id, confidence, commission_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.src_id,
      input.dst_id,
      input.type,
      input.observed_at,
      input.effective_at ?? null,
      JSON.stringify(input.properties ?? {}),
      input.evidence ?? null,
      input.article_id ?? null,
      input.trace_id ?? null,
      input.confidence ?? 1.0,
      input.commission_id ?? null,
      t,
    )
  return Number(result.lastInsertRowid)
}

export function upsertArticle(item: NewsItem): string {
  const id = item.id
  const existing = db.query<{ id: string }, [string]>(`SELECT id FROM articles WHERE id = ?`).get(id)
  if (existing) return existing.id
  const publishedAt = item.publishedAt ? Date.parse(item.publishedAt) : null
  db.query(
    `INSERT INTO articles (id, url, title, summary, source_kind, source_name, published_at, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, item.url, item.title, item.summary, item.source.kind, item.source.name, publishedAt, now())
  return id
}

export function linkArticleEntity(article_id: string, entity_id: string): void {
  db.query(`INSERT OR IGNORE INTO article_entities (article_id, entity_id) VALUES (?, ?)`).run(article_id, entity_id)
}

export function linkCommissionArticle(commission_id: string, article_id: string): void {
  db.query(`INSERT OR REPLACE INTO commission_articles (commission_id, article_id, processed_at) VALUES (?, ?, ?)`).run(
    commission_id,
    article_id,
    now(),
  )
}

export interface InsertTraceInput {
  trace: OgTrace
  model: string
  kind: 'chat' | 'image_edit'
  commission_id?: string | null
}

export function insertTrace(input: InsertTraceInput): number {
  const result = db
    .query(
      `INSERT INTO traces (request_id, provider, model, kind, total_cost_wei, payload, commission_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.trace.request_id,
      input.trace.provider ?? null,
      input.model,
      input.kind,
      input.trace.billing?.total_cost ?? null,
      JSON.stringify(input.trace),
      input.commission_id ?? null,
      now(),
    )
  return Number(result.lastInsertRowid)
}

export interface CreateCommissionInput {
  query_text: string
  entity_id: string
  entity_type: EntityKind
  thesis?: string | null
  owner_id?: string
}

export function createCommission(input: CreateCommissionInput): CommissionRow {
  const id = `c_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`
  const t = now()
  db.query(
    `INSERT INTO commissions (id, owner_id, query_text, entity_id, entity_type, thesis, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`,
  ).run(id, input.owner_id ?? 'anon', input.query_text, input.entity_id, input.entity_type, input.thesis ?? null, t)
  return {
    id,
    owner_id: input.owner_id ?? 'anon',
    query_text: input.query_text,
    entity_id: input.entity_id,
    entity_type: input.entity_type,
    thesis: input.thesis ?? null,
    status: 'active',
    created_at: t,
    paused_at: null,
    dropped_at: null,
  }
}

export function listCommissions(owner_id = 'anon'): CommissionRow[] {
  return db
    .query<CommissionRow, [string]>(
      `SELECT * FROM commissions WHERE owner_id = ? AND status = 'active' ORDER BY created_at DESC`,
    )
    .all(owner_id)
}

export function getCommission(id: string): CommissionRow | null {
  return db.query<CommissionRow, [string]>(`SELECT * FROM commissions WHERE id = ?`).get(id) ?? null
}

export interface GraphPayloadNode {
  id: string
  type: EntityKind
  label: string
  edge_count: number
}

export interface GraphPayloadEdge {
  id: number
  src_id: string
  dst_id: string
  type: EdgeKind
  evidence: string | null
  observed_at: number
  confidence: number
  article_id: string | null
}

export interface GraphPayload {
  nodes: GraphPayloadNode[]
  edges: GraphPayloadEdge[]
}

export function getGraphForCommission(commission_id: string, since?: number): GraphPayload {
  const params: (string | number)[] = [commission_id]
  let edgesSql = `SELECT id, src_id, dst_id, type, evidence, observed_at, confidence, article_id FROM edges WHERE commission_id = ?`
  if (since !== undefined) {
    edgesSql += ` AND created_at > ?`
    params.push(since)
  }
  edgesSql += ` ORDER BY observed_at DESC LIMIT 500`
  const edges = db.query<GraphPayloadEdge, any[]>(edgesSql).all(...params)

  const commission = db
    .query<{ entity_id: string | null }, [string]>(`SELECT entity_id FROM commissions WHERE id = ?`)
    .get(commission_id)

  const nodeIds = new Set<string>()
  for (const e of edges) {
    nodeIds.add(e.src_id)
    nodeIds.add(e.dst_id)
  }
  if (commission?.entity_id) nodeIds.add(commission.entity_id)

  const mentioned = db
    .query<{ entity_id: string }, [string]>(
      `SELECT DISTINCT ae.entity_id FROM article_entities ae
       JOIN commission_articles ca ON ca.article_id = ae.article_id
       WHERE ca.commission_id = ?`,
    )
    .all(commission_id)
  for (const m of mentioned) nodeIds.add(m.entity_id)

  if (nodeIds.size === 0) return { nodes: [], edges: [] }

  const ids = Array.from(nodeIds)
  const placeholders = ids.map(() => '?').join(',')
  const entities = db
    .query<EntityRow, string[]>(`SELECT * FROM entities WHERE id IN (${placeholders})`)
    .all(...ids)

  const edgeCountById = new Map<string, number>()
  for (const e of edges) {
    edgeCountById.set(e.src_id, (edgeCountById.get(e.src_id) ?? 0) + 1)
    edgeCountById.set(e.dst_id, (edgeCountById.get(e.dst_id) ?? 0) + 1)
  }

  const nodes: GraphPayloadNode[] = entities.map((row) => ({
    id: row.id,
    type: row.type,
    label: row.canonical_name,
    edge_count: edgeCountById.get(row.id) ?? 0,
  }))

  return { nodes, edges }
}

export function getEntity(id: string): EntityRow | null {
  return db.query<EntityRow, [string]>(`SELECT * FROM entities WHERE id = ?`).get(id) ?? null
}

export function edgesForEntity(id: string, limit = 50): EdgeRow[] {
  return db
    .query<EdgeRow, [string, string, number]>(
      `SELECT * FROM edges WHERE src_id = ? OR dst_id = ? ORDER BY observed_at DESC LIMIT ?`,
    )
    .all(id, id, limit)
}

export interface BriefRow {
  id: number
  commission_id: string
  article_id: string | null
  body_md: string
  trace_id: string | null
  created_at: number
}

export interface InsertBriefInput {
  commission_id: string
  article_id?: string | null
  body_md: string
  trace_id?: string | null
}

export function insertBrief(input: InsertBriefInput): BriefRow {
  const t = now()
  const result = db
    .query(
      `INSERT INTO briefs (commission_id, article_id, body_md, trace_id, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      input.commission_id,
      input.article_id ?? null,
      input.body_md,
      input.trace_id ?? null,
      t,
    )
  return {
    id: Number(result.lastInsertRowid),
    commission_id: input.commission_id,
    article_id: input.article_id ?? null,
    body_md: input.body_md,
    trace_id: input.trace_id ?? null,
    created_at: t,
  }
}

export function listBriefsForCommission(commission_id: string, limit = 20): BriefRow[] {
  return db
    .query<BriefRow, [string, number]>(
      `SELECT * FROM briefs WHERE commission_id = ? ORDER BY created_at DESC LIMIT ?`,
    )
    .all(commission_id, limit)
}

export interface DigestData {
  commission_id: string
  since: number
  brief_count: number
  briefs: BriefRow[]
  new_entities: { id: string; type: string; name: string }[]
  new_edges_count: number
  top_sources: { name: string; count: number }[]
}

export function getDigestData(commission_id: string, sinceMs: number): DigestData {
  const briefs = db
    .query<BriefRow, [string, number]>(
      `SELECT * FROM briefs WHERE commission_id = ? AND created_at > ? ORDER BY created_at DESC LIMIT 20`,
    )
    .all(commission_id, sinceMs)

  const newEntities = db
    .query<{ id: string; type: string; canonical_name: string }, [string, number]>(
      `SELECT DISTINCT e.id, e.type, e.canonical_name
       FROM entities e
       JOIN article_entities ae ON ae.entity_id = e.id
       JOIN commission_articles ca ON ca.article_id = ae.article_id
       WHERE ca.commission_id = ? AND ca.processed_at > ?
       LIMIT 30`,
    )
    .all(commission_id, sinceMs)
    .map((r) => ({ id: r.id, type: r.type, name: r.canonical_name }))

  const edgeCount = db
    .query<{ n: number }, [string, number]>(
      `SELECT COUNT(*) as n FROM edges WHERE commission_id = ? AND created_at > ?`,
    )
    .get(commission_id, sinceMs)?.n ?? 0

  const topSources = db
    .query<{ name: string; count: number }, [string, number]>(
      `SELECT a.source_name as name, COUNT(*) as count
       FROM articles a
       JOIN commission_articles ca ON ca.article_id = a.id
       WHERE ca.commission_id = ? AND ca.processed_at > ?
       GROUP BY a.source_name
       ORDER BY count DESC
       LIMIT 5`,
    )
    .all(commission_id, sinceMs)

  return {
    commission_id,
    since: sinceMs,
    brief_count: briefs.length,
    briefs,
    new_entities: newEntities,
    new_edges_count: edgeCount,
    top_sources: topSources,
  }
}

export type AlertKind = 'entity_mentioned' | 'edge_type_added' | 'keyword_in_evidence' | 'sentiment_drop'

export interface AlertRuleRow {
  id: number
  commission_id: string
  kind: AlertKind
  config: string
  channel_ids: string
  active: number
  cooldown_seconds: number
  last_fired_at: number | null
  created_at: number
}

export interface AlertEventRow {
  id: number
  rule_id: number
  payload: string
  delivered_to: string | null
  created_at: number
}

export interface CreateAlertRuleInput {
  commission_id: string
  kind: AlertKind
  config: Record<string, unknown>
  cooldown_seconds?: number
}

export function createAlertRule(input: CreateAlertRuleInput): AlertRuleRow {
  const t = now()
  const cooldown = input.cooldown_seconds ?? 3600
  const result = db
    .query(
      `INSERT INTO alert_rules (commission_id, kind, config, channel_ids, active, cooldown_seconds, created_at)
       VALUES (?, ?, ?, '[]', 1, ?, ?)`,
    )
    .run(input.commission_id, input.kind, JSON.stringify(input.config), cooldown, t)
  return getAlertRule(Number(result.lastInsertRowid))!
}

export function getAlertRule(id: number): AlertRuleRow | null {
  return db.query<AlertRuleRow, [number]>(`SELECT * FROM alert_rules WHERE id = ?`).get(id) ?? null
}

export function listAlertRules(commission_id: string): AlertRuleRow[] {
  return db
    .query<AlertRuleRow, [string]>(`SELECT * FROM alert_rules WHERE commission_id = ? ORDER BY created_at DESC`)
    .all(commission_id)
}

export function listActiveAlertRules(commission_id: string): AlertRuleRow[] {
  return db
    .query<AlertRuleRow, [string]>(`SELECT * FROM alert_rules WHERE commission_id = ? AND active = 1`)
    .all(commission_id)
}

export function updateAlertRule(id: number, patch: Partial<{ active: number; cooldown_seconds: number; config: Record<string, unknown> }>): AlertRuleRow | null {
  const sets: string[] = []
  const vals: (string | number | null)[] = []
  if (patch.active !== undefined) {
    sets.push('active = ?')
    vals.push(patch.active ? 1 : 0)
  }
  if (patch.cooldown_seconds !== undefined) {
    sets.push('cooldown_seconds = ?')
    vals.push(patch.cooldown_seconds)
  }
  if (patch.config !== undefined) {
    sets.push('config = ?')
    vals.push(JSON.stringify(patch.config))
  }
  if (!sets.length) return getAlertRule(id)
  vals.push(id)
  db.query(`UPDATE alert_rules SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
  return getAlertRule(id)
}

export function deleteAlertRule(id: number): void {
  db.query(`DELETE FROM alert_events WHERE rule_id = ?`).run(id)
  db.query(`DELETE FROM alert_rules WHERE id = ?`).run(id)
}

export function markAlertFired(id: number): void {
  db.query(`UPDATE alert_rules SET last_fired_at = ? WHERE id = ?`).run(now(), id)
}

export function insertAlertEvent(rule_id: number, payload: Record<string, unknown>, deliveredTo: string[]): AlertEventRow {
  const t = now()
  const result = db
    .query(`INSERT INTO alert_events (rule_id, payload, delivered_to, created_at) VALUES (?, ?, ?, ?)`)
    .run(rule_id, JSON.stringify(payload), JSON.stringify(deliveredTo), t)
  return {
    id: Number(result.lastInsertRowid),
    rule_id,
    payload: JSON.stringify(payload),
    delivered_to: JSON.stringify(deliveredTo),
    created_at: t,
  }
}

export function listAlertEvents(rule_id: number, limit = 20): AlertEventRow[] {
  return db
    .query<AlertEventRow, [number, number]>(`SELECT * FROM alert_events WHERE rule_id = ? ORDER BY created_at DESC LIMIT ?`)
    .all(rule_id, limit)
}

export function listRecentAlertEventsForCommission(commission_id: string, limit = 30): Array<AlertEventRow & { kind: AlertKind }> {
  return db
    .query<AlertEventRow & { kind: AlertKind }, [string, number]>(
      `SELECT ae.*, ar.kind FROM alert_events ae
       JOIN alert_rules ar ON ar.id = ae.rule_id
       WHERE ar.commission_id = ?
       ORDER BY ae.created_at DESC
       LIMIT ?`,
    )
    .all(commission_id, limit)
}

export interface AuditRow {
  ts: number
  kind: string
  related_id: string | null
  summary: string | null
  trace_id: string | null
  commission_id: string | null
}

export function listAuditFeed(limit = 100): AuditRow[] {
  const sql = `
    SELECT * FROM (
      SELECT created_at AS ts, 'commission_created' AS kind, id AS related_id, query_text AS summary, NULL AS trace_id, id AS commission_id FROM commissions
      UNION ALL
      SELECT created_at AS ts, 'brief_generated' AS kind, CAST(id AS TEXT) AS related_id, SUBSTR(body_md, 1, 200) AS summary, trace_id, commission_id FROM briefs
      UNION ALL
      SELECT created_at AS ts, kind || '_inference' AS kind, request_id AS related_id, model || ' · ' || COALESCE(provider, '?') AS summary, request_id AS trace_id, commission_id FROM traces
      UNION ALL
      SELECT created_at AS ts, 'alert_rule_created' AS kind, CAST(id AS TEXT) AS related_id, kind || ' · ' || config AS summary, NULL AS trace_id, commission_id FROM alert_rules
      UNION ALL
      SELECT ae.created_at AS ts, 'alert_fired' AS kind, CAST(ae.id AS TEXT) AS related_id, ar.kind || ' → ' || SUBSTR(ae.payload, 1, 200) AS summary, NULL AS trace_id, ar.commission_id
        FROM alert_events ae JOIN alert_rules ar ON ar.id = ae.rule_id
      UNION ALL
      SELECT created_at AS ts, 'source_added' AS kind, CAST(id AS TEXT) AS related_id, kind || ' · ' || url AS summary, NULL AS trace_id, commission_id FROM sources
      UNION ALL
      SELECT created_at AS ts, 'channel_added' AS kind, CAST(id AS TEXT) AS related_id, kind || ' · ' || target AS summary, NULL AS trace_id, NULL AS commission_id FROM delivery_channels
      UNION ALL
      SELECT processed_at AS ts, 'article_processed' AS kind, article_id AS related_id, NULL AS summary, NULL AS trace_id, commission_id FROM commission_articles
    )
    ORDER BY ts DESC
    LIMIT ?
  `
  return db.query<AuditRow, [number]>(sql).all(limit)
}

export function auditCounts(): Record<string, number> {
  const rows = db
    .query<{ k: string; c: number }, []>(
      `SELECT 'commissions' AS k, COUNT(*) AS c FROM commissions
       UNION ALL SELECT 'briefs', COUNT(*) FROM briefs
       UNION ALL SELECT 'inference_calls', COUNT(*) FROM traces
       UNION ALL SELECT 'alert_rules', COUNT(*) FROM alert_rules
       UNION ALL SELECT 'alerts_fired', COUNT(*) FROM alert_events
       UNION ALL SELECT 'sources', COUNT(*) FROM sources
       UNION ALL SELECT 'channels', COUNT(*) FROM delivery_channels
       UNION ALL SELECT 'articles_processed', COUNT(*) FROM commission_articles`,
    )
    .all()
  const out: Record<string, number> = {}
  for (const r of rows) out[r.k] = r.c
  return out
}

export function totalInferenceCostWei(): string {
  const row = db.query<{ s: string | null }, []>(`SELECT CAST(SUM(CAST(total_cost_wei AS INTEGER)) AS TEXT) AS s FROM traces WHERE total_cost_wei IS NOT NULL`).get()
  return row?.s ?? '0'
}

export function getTelegramChatIdFor(owner_id: string): string | null {
  const row = db
    .query<{ target: string }, [string]>(
      `SELECT target FROM delivery_channels WHERE owner_id = ? AND kind = 'telegram' AND active = 1 LIMIT 1`,
    )
    .get(owner_id)
  return row?.target ?? null
}

export type SourceKind = 'rss' | 'youtube'

export interface SourceRow {
  id: number
  commission_id: string
  kind: SourceKind
  url: string
  label: string | null
  preference: number
  active: number
  last_fetched_at: number | null
  last_item_count: number | null
  last_error: string | null
  created_at: number
}

export interface CreateSourceInput {
  commission_id: string
  kind: SourceKind
  url: string
  label?: string | null
}

export function createSource(input: CreateSourceInput): SourceRow {
  const t = now()
  const result = db
    .query(
      `INSERT INTO sources (commission_id, kind, url, label, preference, active, created_at)
       VALUES (?, ?, ?, ?, 0, 1, ?)`,
    )
    .run(input.commission_id, input.kind, input.url, input.label ?? null, t)
  return getSource(Number(result.lastInsertRowid))!
}

export function getSource(id: number): SourceRow | null {
  return db.query<SourceRow, [number]>(`SELECT * FROM sources WHERE id = ?`).get(id) ?? null
}

export function listSources(commission_id: string): SourceRow[] {
  return db
    .query<SourceRow, [string]>(`SELECT * FROM sources WHERE commission_id = ? ORDER BY created_at DESC`)
    .all(commission_id)
}

export function listActiveSources(commission_id: string): SourceRow[] {
  return db
    .query<SourceRow, [string]>(
      `SELECT * FROM sources WHERE commission_id = ? AND active = 1 ORDER BY preference DESC, created_at DESC`,
    )
    .all(commission_id)
}

export function updateSource(id: number, patch: Partial<{ active: number; preference: number; label: string | null }>): SourceRow | null {
  const sets: string[] = []
  const vals: (string | number | null)[] = []
  for (const k of ['active', 'preference', 'label'] as const) {
    if (patch[k] !== undefined) {
      sets.push(`${k} = ?`)
      vals.push(patch[k] ?? null)
    }
  }
  if (sets.length === 0) return getSource(id)
  vals.push(id)
  db.query(`UPDATE sources SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
  return getSource(id)
}

export function recordSourceFetch(id: number, itemCount: number, error: string | null): void {
  db.query(`UPDATE sources SET last_fetched_at = ?, last_item_count = ?, last_error = ? WHERE id = ?`).run(
    now(),
    itemCount,
    error,
    id,
  )
}

export function deleteSource(id: number): void {
  db.query(`DELETE FROM sources WHERE id = ?`).run(id)
}

const SEED_ALIASES: Array<{ entityId: string; aliases: string[] }> = [
  { entityId: 'token:bitcoin', aliases: ['bitcoin', 'btc', 'token:btc'] },
  { entityId: 'token:ethereum', aliases: ['ethereum', 'eth', 'ether', 'token:eth'] },
  { entityId: 'token:solana', aliases: ['solana', 'sol', 'token:sol'] },
  { entityId: 'token:usdc', aliases: ['usdc', 'usd coin', 'token:usd-coin'] },
  { entityId: 'token:usdt', aliases: ['usdt', 'tether', 'token:tether'] },
  { entityId: 'token:bnb', aliases: ['bnb', 'binance coin', 'token:binance-coin'] },
  { entityId: 'token:xrp', aliases: ['xrp', 'ripple', 'token:ripple'] },
  { entityId: 'token:doge', aliases: ['doge', 'dogecoin', 'token:dogecoin'] },
  { entityId: 'token:ada', aliases: ['ada', 'cardano', 'token:cardano'] },
  { entityId: 'token:avax', aliases: ['avax', 'avalanche', 'token:avalanche'] },
  { entityId: 'token:matic', aliases: ['matic', 'polygon', 'token:polygon'] },
  { entityId: 'token:link', aliases: ['link', 'chainlink', 'token:chainlink'] },
  { entityId: 'token:dot', aliases: ['dot', 'polkadot', 'token:polkadot'] },
  { entityId: 'token:atom', aliases: ['atom', 'cosmos', 'token:cosmos'] },
  { entityId: 'token:near', aliases: ['near', 'near protocol', 'token:near-protocol'] },
  { entityId: 'token:apt', aliases: ['apt', 'aptos', 'token:aptos'] },
  { entityId: 'token:sui', aliases: ['sui', 'token:sui'] },
  { entityId: 'token:arb', aliases: ['arb', 'arbitrum', 'token:arbitrum'] },
  { entityId: 'token:op', aliases: ['op', 'optimism', 'token:optimism'] },
  { entityId: 'protocol:uniswap', aliases: ['uniswap', 'uni', 'token:uni'] },
  { entityId: 'protocol:aave', aliases: ['aave', 'token:aave'] },
  { entityId: 'protocol:lido', aliases: ['lido', 'lido finance', 'token:ldo'] },
  { entityId: 'protocol:makerdao', aliases: ['maker', 'makerdao', 'mkr', 'token:mkr'] },
  { entityId: 'protocol:curve', aliases: ['curve', 'curve finance', 'crv', 'token:crv'] },
  { entityId: 'protocol:compound', aliases: ['compound', 'compound finance', 'comp', 'token:comp'] },
  { entityId: 'protocol:base', aliases: ['base', 'base chain'] },
  { entityId: 'protocol:arbitrum', aliases: ['arbitrum', 'arbitrum one'] },
  { entityId: 'protocol:optimism', aliases: ['optimism', 'op mainnet'] },
  { entityId: 'protocol:ethereum', aliases: ['ethereum'] },
  { entityId: 'protocol:solana', aliases: ['solana'] },
]

export function seedEntityAliases(): void {
  const t = now()
  const insertAlias = db.query(
    `INSERT OR IGNORE INTO entity_aliases (alias_lower, entity_id, created_at) VALUES (?, ?, ?)`,
  )
  for (const { entityId, aliases } of SEED_ALIASES) {
    for (const raw of aliases) {
      const lower = raw.toLowerCase().trim()
      if (!lower) continue
      insertAlias.run(lower, entityId, t)
    }
  }
}
