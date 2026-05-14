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
  const existing = db.query<EntityRow, [string]>(`SELECT * FROM entities WHERE id = ?`).get(input.canonical_id)
  if (existing) {
    const mergedAliases = mergeAliases(JSON.parse(existing.aliases) as string[], input.aliases ?? [], input.name, existing.canonical_name)
    db.query(`UPDATE entities SET aliases = ?, updated_at = ? WHERE id = ?`).run(
      JSON.stringify(mergedAliases),
      t,
      input.canonical_id,
    )
    return { ...existing, aliases: JSON.stringify(mergedAliases), updated_at: t }
  }
  const aliases = input.aliases ?? []
  db.query(
    `INSERT INTO entities (id, type, canonical_name, aliases, attributes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    input.canonical_id,
    input.type,
    input.name,
    JSON.stringify(aliases),
    JSON.stringify(input.attributes ?? {}),
    t,
    t,
  )
  return {
    id: input.canonical_id,
    type: input.type,
    canonical_name: input.name,
    aliases: JSON.stringify(aliases),
    attributes: JSON.stringify(input.attributes ?? {}),
    created_at: t,
    updated_at: t,
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
