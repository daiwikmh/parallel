export type EntityKind =
  | 'token'
  | 'protocol'
  | 'company'
  | 'person'
  | 'jurisdiction'
  | 'event'
  | 'topic'

export const ENTITY_KINDS: EntityKind[] = [
  'token',
  'protocol',
  'company',
  'person',
  'jurisdiction',
  'event',
  'topic',
]

export type EdgeKind =
  | 'founded'
  | 'works_at'
  | 'partners_with'
  | 'invests_in'
  | 'regulates'
  | 'built_on'
  | 'competes_with'
  | 'mentions'
  | 'affects'
  | 'holds_treasury_in'
  | 'audited_by'
  | 'exploited'
  | 'merged_into'
  | 'forked_from'
  | 'announced'
  | 'denied'

export const EDGE_KINDS: EdgeKind[] = [
  'founded',
  'works_at',
  'partners_with',
  'invests_in',
  'regulates',
  'built_on',
  'competes_with',
  'mentions',
  'affects',
  'holds_treasury_in',
  'audited_by',
  'exploited',
  'merged_into',
  'forked_from',
  'announced',
  'denied',
]

export interface EntityRow {
  id: string
  type: EntityKind
  canonical_name: string
  aliases: string
  attributes: string
  created_at: number
  updated_at: number
}

export interface EdgeRow {
  id: number
  src_id: string
  dst_id: string
  type: EdgeKind
  observed_at: number
  effective_at: number | null
  t_end: number | null
  properties: string
  evidence: string | null
  article_id: string | null
  trace_id: string | null
  confidence: number
  commission_id: string | null
  created_at: number
}

export interface CommissionRow {
  id: string
  owner_id: string
  query_text: string
  entity_id: string | null
  entity_type: EntityKind | null
  thesis: string | null
  status: 'active' | 'paused' | 'dropped'
  created_at: number
  paused_at: number | null
  dropped_at: number | null
  tg_alerts: number
  tg_briefs: number
}

export interface ArticleRow {
  id: string
  url: string | null
  title: string
  summary: string | null
  source_kind: string | null
  source_name: string | null
  published_at: number | null
  fetched_at: number
  body: string | null
}

export interface TraceRow {
  id: number
  request_id: string
  provider: string | null
  model: string | null
  kind: 'chat' | 'image_edit'
  total_cost_wei: string | null
  payload: string | null
  commission_id: string | null
  created_at: number
}
