import type { NewsItem, EditorialResult } from '../lib/types'
import { getCachedNews } from '../worker/cache'
import { generateEditorial } from './editorial'
import { extractGraph } from './extract'
import { addActivity } from './activity'
import { upsertArticle, upsertEntity, insertEdge, insertTrace, getCommission, getEntity } from '../db/repo'

export interface AgentRunResult {
  pickedItem: NewsItem
  editorial: EditorialResult
  model: string
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number }
  startedAt: number
  finishedAt: number
  durationMs: number
  graph: { entities: number; edges: number }
  commissionId?: string
}

export interface RunOptions {
  commissionId?: string
  pickedItem?: NewsItem
}

let lastResult: AgentRunResult | null = null
let inflight: Promise<AgentRunResult> | null = null

export function isRunning(): boolean {
  return inflight !== null
}

export function getLastResult(): AgentRunResult | null {
  return lastResult
}

export async function runAgentOnce(opts: RunOptions = {}): Promise<AgentRunResult> {
  if (inflight) return inflight
  inflight = runInternal(opts).finally(() => {
    inflight = null
  })
  return inflight
}

async function runInternal(opts: RunOptions): Promise<AgentRunResult> {
  const startedAt = Date.now()
  const commissionId = opts.commissionId

  try {
    let pickedItem: NewsItem
    if (opts.pickedItem) {
      pickedItem = opts.pickedItem
      addActivity('PICK', `[${pickedItem.source.name}] ${truncate(pickedItem.title, 90)} (override)`)
    } else if (commissionId) {
      const commission = getCommission(commissionId)
      if (!commission || !commission.entity_id) throw new Error(`commission ${commissionId} not found or has no entity`)
      const entity = getEntity(commission.entity_id)
      if (!entity) throw new Error(`entity ${commission.entity_id} not found`)
      const aliases = JSON.parse(entity.aliases) as string[]
      const terms = [entity.canonical_name, ...aliases].filter((t) => t.length >= 2)
      addActivity('SCAN', `fetching news, filtering for: ${terms.slice(0, 4).join(', ')}`)
      const news = await getCachedNews()
      const filtered = filterByTerms(news.ranked, terms)
      if (!filtered.length) throw new Error(`no news items found mentioning ${entity.canonical_name}`)
      pickedItem = filtered[0]
      addActivity('PICK', `[${pickedItem.source.name}] ${truncate(pickedItem.title, 90)}`)
    } else {
      addActivity('SCAN', 'fetching news across all providers')
      const news = await getCachedNews()
      if (!news.ranked.length) throw new Error('no news items available')
      pickedItem = news.ranked[0]
      addActivity('PICK', `[${pickedItem.source.name}] ${truncate(pickedItem.title, 90)}`)
    }

    upsertArticle(pickedItem)

    addActivity('WRITE', 'calling 0G Compute for editorial')
    const { editorial, source } = await generateEditorial(pickedItem)
    if (source.trace) insertTrace({ trace: source.trace, model: source.model, kind: 'chat', commission_id: commissionId ?? null })

    addActivity('GRAPH', 'extracting typed entities and edges')
    let graphCounts = { entities: 0, edges: 0 }
    try {
      const { result: extracted, source: extractSource } = await extractGraph(pickedItem)
      if (extractSource.trace) insertTrace({ trace: extractSource.trace, model: extractSource.model, kind: 'chat', commission_id: commissionId ?? null })

      for (const ent of extracted.entities) {
        upsertEntity({
          canonical_id: ent.canonical_id,
          type: ent.type,
          name: ent.name,
          aliases: ent.aliases,
        })
      }

      const observedAt = pickedItem.publishedAt ? Date.parse(pickedItem.publishedAt) : Date.now()
      for (const edge of extracted.edges) {
        insertEdge({
          src_id: edge.src_canonical_id,
          dst_id: edge.dst_canonical_id,
          type: edge.type,
          observed_at: observedAt,
          properties: edge.properties,
          evidence: edge.evidence,
          article_id: pickedItem.id,
          trace_id: extractSource.trace?.request_id ?? null,
          confidence: edge.confidence,
          commission_id: commissionId ?? null,
        })
      }
      graphCounts = { entities: extracted.entities.length, edges: extracted.edges.length }
    } catch (extractErr) {
      addActivity('WARN', `graph extraction failed: ${(extractErr as Error).message}`)
    }

    const finishedAt = Date.now()
    const result: AgentRunResult = {
      pickedItem,
      editorial,
      model: source.model,
      usage: source.usage,
      startedAt,
      finishedAt,
      durationMs: finishedAt - startedAt,
      graph: graphCounts,
      commissionId,
    }

    addActivity(
      'DONE',
      `${graphCounts.entities} entities · ${graphCounts.edges} edges · ${source.usage?.totalTokens ?? '?'} tokens · ${result.durationMs}ms`,
    )
    lastResult = result
    return result
  } catch (err) {
    const msg = (err as Error).message
    addActivity('ERROR', msg)
    throw err
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

function filterByTerms(items: NewsItem[], terms: string[]): NewsItem[] {
  if (!terms.length) return items
  const lower = terms.map((t) => t.toLowerCase())
  return items.filter((item) => {
    const hay = `${item.title} ${item.summary}`.toLowerCase()
    return lower.some((t) => hay.includes(t))
  })
}
