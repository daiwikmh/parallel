import type { NewsItem } from '../lib/types'
import { chatJson, type ChatMessage, type ChatResult } from '../og/compute'
import {
  ENTITY_KINDS,
  EDGE_KINDS,
  type EntityKind,
  type EdgeKind,
} from '../lib/types/graph-db.types'

export interface ExtractedEntity {
  name: string
  type: EntityKind
  canonical_id: string
  aliases: string[]
  sentiment?: number
}

export interface ExtractedEdge {
  src_canonical_id: string
  dst_canonical_id: string
  type: EdgeKind
  properties: Record<string, unknown>
  evidence: string
  confidence: number
}

export interface ExtractionResult {
  entities: ExtractedEntity[]
  edges: ExtractedEdge[]
}

export interface ExtractionOutput {
  result: ExtractionResult
  source: ChatResult
}

const ENTITY_TYPE_HINTS: Record<EntityKind, string> = {
  token: 'cryptocurrencies, stablecoins, native tokens (Bitcoin, USDC, SOL)',
  protocol: 'DeFi or web3 protocols (Uniswap, Lido, Aave)',
  company: 'businesses or organizations (Coinbase, BlackRock, Circle)',
  person: 'individuals (Vitalik Buterin, Sam Altman)',
  jurisdiction: 'regulators, governments, or legal frameworks (US SEC, EU MiCA)',
  event: 'discrete dated occurrences (DAO Hack, Ethereum Merge, exchange listing)',
  topic: 'broad themes (L2 fee compression, restaking)',
}

const EDGE_SHAPES: Record<EdgeKind, { src: EntityKind[]; dst: EntityKind[] }> = {
  founded: { src: ['person'], dst: ['company', 'protocol'] },
  works_at: { src: ['person'], dst: ['company'] },
  partners_with: { src: ['company', 'protocol'], dst: ['company', 'protocol'] },
  invests_in: { src: ['company', 'person'], dst: ['company', 'protocol', 'token'] },
  regulates: { src: ['jurisdiction'], dst: ['token', 'protocol', 'company', 'person', 'topic'] },
  built_on: { src: ['protocol'], dst: ['protocol', 'token'] },
  competes_with: { src: ['company', 'protocol'], dst: ['company', 'protocol'] },
  mentions: { src: ['event'], dst: ['token', 'protocol', 'company', 'person', 'jurisdiction', 'topic'] },
  affects: { src: ['event'], dst: ['token', 'protocol', 'company', 'person', 'jurisdiction', 'topic'] },
  holds_treasury_in: { src: ['company'], dst: ['token'] },
  audited_by: { src: ['protocol'], dst: ['company'] },
  exploited: { src: ['event'], dst: ['protocol'] },
  merged_into: { src: ['protocol'], dst: ['protocol'] },
  forked_from: { src: ['protocol'], dst: ['protocol'] },
  announced: { src: ['company', 'person', 'protocol'], dst: ['event'] },
  denied: { src: ['company', 'person', 'protocol'], dst: ['event', 'topic'] },
}

const EDGE_TYPE_HINTS: Record<EdgeKind, string> = {
  founded: 'PERSON → COMPANY|PROTOCOL. Person founded the org.',
  works_at: 'PERSON → COMPANY. Person currently or formerly worked at company. Never company-to-company.',
  partners_with: 'COMPANY|PROTOCOL → COMPANY|PROTOCOL. Business partnership, custody arrangement, integration deal.',
  invests_in: 'COMPANY|PERSON → COMPANY|PROTOCOL|TOKEN. Provided capital.',
  regulates: 'JURISDICTION → any. Regulator takes action or issues guidance against an entity.',
  built_on: 'PROTOCOL → PROTOCOL|TOKEN. Built on top of an L1 or another protocol.',
  competes_with: 'COMPANY|PROTOCOL ↔ COMPANY|PROTOCOL. Direct competitors.',
  mentions: 'EVENT → any. Event explicitly references the entity.',
  affects: 'EVENT → any. Event impacts the entity. Set properties.direction: positive|negative|neutral.',
  holds_treasury_in: 'COMPANY → TOKEN. Company holds a cryptocurrency token in its corporate treasury. NEVER company-to-company.',
  audited_by: 'PROTOCOL → COMPANY. Protocol was security-audited by the company.',
  exploited: 'EVENT → PROTOCOL. Event was a hack/exploit against the protocol.',
  merged_into: 'PROTOCOL → PROTOCOL. Protocol merged into another.',
  forked_from: 'PROTOCOL → PROTOCOL. Protocol was forked from another.',
  announced: 'COMPANY|PERSON|PROTOCOL → EVENT. Entity announced a discrete event (launch, partnership, filing).',
  denied: 'any → any. Entity denied a claim about another entity (set properties.claim).',
}

function entityTypeLines(): string {
  return ENTITY_KINDS.map((k) => `  - ${k} — ${ENTITY_TYPE_HINTS[k]}`).join('\n')
}

function edgeTypeLines(): string {
  return EDGE_KINDS.map((k) => `  - ${k} — ${EDGE_TYPE_HINTS[k]}`).join('\n')
}

const SYSTEM = `You are an extraction agent for a knowledge graph about crypto, finance, tech, and regulation.

From the news article, identify named entities and the explicit, evidenced relationships between them.

ENTITY TYPES (use EXACTLY one of these strings for "type"):
${entityTypeLines()}

EDGE TYPES (use EXACTLY one of these strings for edge "type"; if no edge type fits, do NOT include the edge):
${edgeTypeLines()}

OUTPUT a single JSON object, no prose, no code fences, this exact shape:
{
  "entities": [
    { "name": "Bitcoin", "type": "token", "canonical_id": "token:btc", "aliases": ["BTC"], "sentiment": 0.6 }
  ],
  "edges": [
    {
      "src_canonical_id": "company:coinbase",
      "dst_canonical_id": "company:blackrock",
      "type": "partners_with",
      "properties": { "partnership_type": "custody", "asset": "token:btc" },
      "evidence": "Coinbase Custody to handle Bitcoin reserves for BlackRock's spot BTC ETF",
      "confidence": 0.95
    }
  ]
}

RULES:
- Entity "type" MUST be exactly one of the entity types above. Skip the entity if no type fits.
- Entity "sentiment" is a number 0.0 to 1.0 reflecting the article's tone toward THIS entity (0 = very negative, 0.5 = neutral, 1 = very positive). Default 0.5 if unclear.
- Edge "type" MUST be exactly one of the edge types above. Skip the edge if no type fits.
- Every edge MUST satisfy the domain → range types stated in the edge type description. If types do not match, SKIP THE EDGE — do not pick a different edge type just to keep it.
- If the article describes a discrete occurrence (hack, exploit, listing, launch, filing, lawsuit, acquisition, announcement, agreement), CREATE an event entity for it (e.g. "event:curve-exploit-2026", "event:sec-vs-binance-2026") and emit "exploited", "affects", "announced", or "mentions" edges from that event entity.
- "evidence" MUST be a near-verbatim quote from the article supporting the specific edge claimed.
- "confidence" is 0.0 to 1.0; lower it when the relationship is implied rather than stated.
- "canonical_id" format is "<type>:<lowercase-slug>", e.g. "person:vitalik-buterin".
- Do NOT invent edges based on entities merely co-occurring in the article.
- Do NOT invent new edge or entity types. If you cannot decide between two edge types, SKIP the edge.
- Return at most 8 entities and 6 edges.`

export interface RowExtractContext {
  commissionName?: string
  commissionType?: string
  filename?: string
  rowIndex?: number
}

export async function extractFromRow(
  row: Record<string, string>,
  headers: string[],
  ctx: RowExtractContext = {},
): Promise<ExtractionOutput> {
  const headerLine = headers.length ? headers.join(', ') : Object.keys(row).join(', ')
  const rowLine = headers
    .map((h) => `${h}: ${(row[h] ?? '').toString().trim()}`)
    .filter((s) => !s.endsWith(': '))
    .join(' | ')
  const contextLine = ctx.commissionName
    ? `Commission context: ${ctx.commissionName}${ctx.commissionType ? ` (${ctx.commissionType})` : ''}.`
    : ''
  const fileLine = ctx.filename ? `Source file: ${ctx.filename}${ctx.rowIndex !== undefined ? ` row ${ctx.rowIndex + 1}` : ''}.` : ''

  const user = `${contextLine}
${fileLine}
CSV headers: [${headerLine}]
Row data: ${rowLine}

This is a single row from a user-uploaded dataset. Treat it like a mini news article: extract entities and typed relationships that match the schema. Skip the row if relationships are unclear. Return the extraction JSON now.`

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: user },
  ]

  const { data, result } = await chatJson<{
    entities?: unknown
    edges?: unknown
  }>(messages, { temperature: 0.2, maxTokens: 900 })

  return { result: validate(data), source: result }
}

export async function extractGraph(item: NewsItem): Promise<ExtractionOutput> {
  const user = `Article:
- Title: ${item.title}
- Source: ${item.source.name}
- URL: ${item.url}
- Published: ${item.publishedAt}
- Summary: ${item.summary}

Return the extraction JSON now.`

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: user },
  ]

  const { data, result } = await chatJson<{
    entities?: unknown
    edges?: unknown
  }>(messages, { temperature: 0.2, maxTokens: 1200 })

  return { result: validate(data), source: result }
}

const PRODUCT_DENYLIST = new Set([
  'cursor', 'claude', 'claude code', 'claude-code', 'aider', 'copilot', 'github copilot',
  'chatgpt', 'gpt-4', 'gpt-5', 'notion', 'windsurf', 'lovable', 'replit', 'v0',
  'midjourney', 'stable diffusion', 'sora', 'runway', 'perplexity', 'devin',
  'figma', 'linear', 'slack', 'discord', 'telegram', 'twitter', 'x',
  'vscode', 'visual studio code', 'jetbrains', 'intellij',
])

function isLikelyProduct(name: string): boolean {
  return PRODUCT_DENYLIST.has(name.toLowerCase().trim())
}

function validate(data: { entities?: unknown; edges?: unknown }): ExtractionResult {
  const entities: ExtractedEntity[] = []
  const seenIds = new Set<string>()
  if (Array.isArray(data.entities)) {
    for (const raw of data.entities) {
      if (!raw || typeof raw !== 'object') continue
      const e = raw as Partial<ExtractedEntity>
      if (typeof e.name !== 'string' || !e.name.trim()) continue
      if (typeof e.type !== 'string' || !ENTITY_KINDS.includes(e.type as EntityKind)) continue
      let resolvedType = e.type as EntityKind
      if (resolvedType === 'token' && isLikelyProduct(e.name)) {
        resolvedType = 'topic'
      }
      const canonical_id =
        typeof e.canonical_id === 'string' && e.canonical_id.includes(':')
          ? (resolvedType === e.type
              ? e.canonical_id.toLowerCase().trim()
              : `${resolvedType}:${slug(e.name)}`)
          : `${resolvedType}:${slug(e.name)}`
      if (seenIds.has(canonical_id)) continue
      seenIds.add(canonical_id)
      const sentiment = typeof e.sentiment === 'number' && e.sentiment >= 0 && e.sentiment <= 1 ? e.sentiment : 0.5
      entities.push({
        name: e.name.trim(),
        type: resolvedType,
        canonical_id,
        aliases: Array.isArray(e.aliases)
          ? e.aliases.filter((a): a is string => typeof a === 'string' && a.trim().length > 0).map((a) => a.trim())
          : [],
        sentiment,
      })
    }
  }

  const entityTypeById = new Map(entities.map((e) => [e.canonical_id, e.type]))

  const edges: ExtractedEdge[] = []
  if (Array.isArray(data.edges)) {
    for (const raw of data.edges) {
      if (!raw || typeof raw !== 'object') continue
      const e = raw as Partial<ExtractedEdge>
      if (typeof e.src_canonical_id !== 'string' || typeof e.dst_canonical_id !== 'string') continue
      if (typeof e.type !== 'string' || !EDGE_KINDS.includes(e.type as EdgeKind)) continue
      if (typeof e.evidence !== 'string' || !e.evidence.trim()) continue
      const src = e.src_canonical_id.toLowerCase().trim()
      const dst = e.dst_canonical_id.toLowerCase().trim()
      if (src === dst) continue
      const srcType = entityTypeById.get(src)
      const dstType = entityTypeById.get(dst)
      if (!srcType || !dstType) continue
      const shape = EDGE_SHAPES[e.type as EdgeKind]
      if (!shape.src.includes(srcType) || !shape.dst.includes(dstType)) continue
      const confidence = typeof e.confidence === 'number' && e.confidence >= 0 && e.confidence <= 1 ? e.confidence : 0.5
      edges.push({
        src_canonical_id: src,
        dst_canonical_id: dst,
        type: e.type as EdgeKind,
        properties: typeof e.properties === 'object' && e.properties !== null ? (e.properties as Record<string, unknown>) : {},
        evidence: e.evidence.trim(),
        confidence,
      })
    }
  }

  return { entities, edges }
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}
