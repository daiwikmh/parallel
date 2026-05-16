import type { NewsItem, EditorialResult } from '../lib/types'
import { getCachedNews } from '../worker/cache'
import { searchNewsForEntity } from '../worker/entitySearch'
import { fetchUserSources } from '../worker/userSources'
import { generateEditorial } from './editorial'
import { extractGraph } from './extract'
import { addActivity } from './activity'
import {
  upsertArticle,
  upsertEntity,
  insertEdge,
  insertTrace,
  insertBrief,
  getCommission,
  getEntity,
  linkArticleEntity,
  linkCommissionArticle,
  getTelegramChatIdFor,
} from '../db/repo'
import { sendTelegramText } from '../integrations/telegram-send'
import { refreshTokenPrice } from '../worker/priceData'
import { uploadJSON } from '../og/storage'
import { db } from '../db/client'
import { evaluateAndFire } from '../alerts/engine'

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

export interface BatchRunResult {
  commissionId: string
  processed: number
  totalEntities: number
  totalEdges: number
  durationMs: number
  errors: string[]
  status: 'ok' | 'no_coverage'
  message?: string
  source: 'cache' | 'targeted' | 'none'
}

let lastResult: AgentRunResult | null = null
let runningPromise: Promise<unknown> | null = null

export function isRunning(): boolean {
  return runningPromise !== null
}

export function getLastResult(): AgentRunResult | null {
  return lastResult
}

async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  if (runningPromise) throw new Error('agent run already in progress')
  const p = fn()
  runningPromise = p
  try {
    return await p
  } finally {
    runningPromise = null
  }
}

export async function runAgentOnce(opts: RunOptions = {}): Promise<AgentRunResult> {
  return withLock(() => runOnce(opts))
}

export async function runCommissionBatch(commissionId: string, limit = 3): Promise<BatchRunResult> {
  return withLock(async () => {
    const startedAt = Date.now()
    const commission = getCommission(commissionId)
    if (!commission || !commission.entity_id) throw new Error(`commission ${commissionId} not found or has no entity`)
    const entity = getEntity(commission.entity_id)
    if (!entity) throw new Error(`entity ${commission.entity_id} not found`)
    const aliases = JSON.parse(entity.aliases) as string[]
    const terms = [entity.canonical_name, ...aliases].filter((t) => t.length >= 2)

    if (entity.type === 'token' || entity.type === 'protocol') {
      try {
        const existingAttrs = JSON.parse(entity.attributes) as Record<string, unknown>
        const existingPrice = existingAttrs.price as { coingecko_id?: string } | undefined
        const price = await refreshTokenPrice(entity.canonical_name, existingPrice?.coingecko_id)
        if (price) upsertEntity({ canonical_id: entity.id, type: entity.type, name: entity.canonical_name, attributes: { price } })
      } catch (e) {
        addActivity('WARN', `price refresh failed: ${(e as Error).message}`)
      }
    }

    addActivity('SCAN', `cache filter for ${terms.slice(0, 4).join(', ')}`)
    const news = await getCachedNews()
    const cacheItems = filterByTerms(news.ranked, terms)

    addActivity('SOURCES', 'fetching your custom sources')
    let userItems: NewsItem[] = []
    try {
      const fetched = await fetchUserSources(commissionId)
      const flat: NewsItem[] = []
      for (const r of fetched) {
        if (r.error) addActivity('WARN', `source ${r.source.url} failed: ${r.error.slice(0, 80)}`)
        flat.push(...r.items)
      }
      userItems = filterByTerms(flat, terms)
      if (userItems.length > 0) addActivity('SOURCES', `${userItems.length} matching items from your sources`)
    } catch (e) {
      addActivity('WARN', `user sources fetch failed: ${(e as Error).message}`)
    }

    const merged = mergeAndDedupe(userItems, cacheItems).slice(0, limit)
    let filtered = merged
    let source: 'cache' | 'targeted' | 'none' = filtered.length ? 'cache' : 'none'

    if (filtered.length === 0) {
      addActivity('SEARCH', `cache miss, searching Google News for ${entity.canonical_name}`)
      try {
        const fresh = await searchNewsForEntity(entity.canonical_name, aliases, Math.max(limit * 2, 6))
        const freshFiltered = filterByTerms(fresh, terms).slice(0, limit)
        if (freshFiltered.length > 0) {
          filtered = freshFiltered
          source = 'targeted'
        }
      } catch (e) {
        addActivity('WARN', `targeted search failed: ${(e as Error).message}`)
      }
    }

    if (filtered.length === 0) {
      addActivity('NOCOV', `no coverage found for ${entity.canonical_name}`)
      return {
        commissionId,
        processed: 0,
        totalEntities: 0,
        totalEdges: 0,
        durationMs: Date.now() - startedAt,
        errors: [],
        status: 'no_coverage',
        message: `No current news coverage found for ${entity.canonical_name}. The agent will check again on the next autonomous run.`,
        source: 'none',
      }
    }

    addActivity('BATCH', `processing ${filtered.length} article${filtered.length === 1 ? '' : 's'} (source: ${source})`)

    const errors: string[] = []
    let totalEntities = 0
    let totalEdges = 0
    let processed = 0
    const briefedItems: NewsItem[] = []
    for (const item of filtered) {
      try {
        const r = await runOnce({ commissionId, pickedItem: item })
        totalEntities += r.graph.entities
        totalEdges += r.graph.edges
        processed++
        briefedItems.push(r.pickedItem)
      } catch (e) {
        errors.push((e as Error).message)
      }
    }

    if (commission.tg_briefs === 1 && briefedItems.length > 0) {
      try {
        const chatId = getTelegramChatIdFor(commission.owner_id) ?? getTelegramChatIdFor('anon')
        if (chatId) {
          const digest = formatBriefDigest(commission.query_text, briefedItems, totalEntities, totalEdges)
          const r = await sendTelegramText(chatId, digest)
          addActivity('ALERT', `briefs digest → ${r}`)
        } else {
          addActivity('WARN', 'tg_briefs is on but no chat_id is set')
        }
      } catch (e) {
        addActivity('WARN', `brief digest send failed: ${(e as Error).message}`)
      }
    }

    return {
      commissionId,
      processed,
      totalEntities,
      totalEdges,
      durationMs: Date.now() - startedAt,
      errors,
      status: 'ok',
      source,
    }
  })
}

function formatBriefDigest(query: string, items: NewsItem[], entities: number, edges: number): string {
  const head = `[BRIEFS] ${query} — ${items.length} new brief${items.length === 1 ? '' : 's'} (+${entities} entities, +${edges} relations)`
  const lines = items.slice(0, 6).map((it, i) => {
    const title = it.title.length > 110 ? it.title.slice(0, 107) + '…' : it.title
    return `${i + 1}. ${title}\n${it.url}`
  })
  return [head, '', ...lines].join('\n')
}

async function runOnce(opts: RunOptions): Promise<AgentRunResult> {
  const startedAt = Date.now()
  const commissionId = opts.commissionId

  try {
    let pickedItem: NewsItem
    if (opts.pickedItem) {
      pickedItem = opts.pickedItem
      addActivity('PICK', `[${pickedItem.source.name}] ${truncate(pickedItem.title, 90)}`)
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
    if (commissionId) linkCommissionArticle(commissionId, pickedItem.id)

    addActivity('WRITE', 'calling 0G Compute for editorial')
    const { editorial, source } = await generateEditorial(pickedItem)
    if (source.trace) insertTrace({ trace: source.trace, model: source.model, kind: 'chat', commission_id: commissionId ?? null })

    let briefId: number | null = null
    if (commissionId) {
      const briefBody = formatBriefMarkdown(pickedItem, editorial.editorial)
      const brief = insertBrief({
        commission_id: commissionId,
        article_id: pickedItem.id,
        body_md: briefBody,
        trace_id: source.trace?.request_id ?? null,
      })
      briefId = brief.id
    }

    addActivity('GRAPH', 'extracting typed entities and edges')
    let graphCounts = { entities: 0, edges: 0 }
    try {
      const { result: extracted, source: extractSource } = await extractGraph(pickedItem)
      if (extractSource.trace) insertTrace({ trace: extractSource.trace, model: extractSource.model, kind: 'chat', commission_id: commissionId ?? null })

      for (const ent of extracted.entities) {
        const attrs: Record<string, unknown> = {}
        if (typeof ent.sentiment === 'number') {
          attrs.sentiment = ent.sentiment
          attrs.sentiment_at = Date.now()
          attrs.sentiment_article_id = pickedItem.id
        }
        upsertEntity({
          canonical_id: ent.canonical_id,
          type: ent.type,
          name: ent.name,
          aliases: ent.aliases,
          attributes: Object.keys(attrs).length ? attrs : undefined,
        })
        linkArticleEntity(pickedItem.id, ent.canonical_id)
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

      const articleEventId = `event:article-${pickedItem.id}`
      const titleLabel = truncate(pickedItem.title, 60)
      upsertEntity({
        canonical_id: articleEventId,
        type: 'event',
        name: titleLabel,
        aliases: [],
        attributes: {
          full_title: pickedItem.title,
          url: pickedItem.url,
          source: pickedItem.source.name,
          source_kind: pickedItem.source.kind,
          published_at: pickedItem.publishedAt,
          article_id: pickedItem.id,
        },
      })
      linkArticleEntity(pickedItem.id, articleEventId)

      let mentionsAdded = 0
      const linkTargets = new Set<string>()
      for (const ent of extracted.entities) linkTargets.add(ent.canonical_id)
      if (commissionId) {
        const c = getCommission(commissionId)
        if (c?.entity_id) linkTargets.add(c.entity_id)
      }
      for (const targetId of linkTargets) {
        insertEdge({
          src_id: articleEventId,
          dst_id: targetId,
          type: 'mentions',
          observed_at: observedAt,
          properties: {},
          evidence: pickedItem.title,
          article_id: pickedItem.id,
          trace_id: extractSource.trace?.request_id ?? null,
          confidence: 0.7,
          commission_id: commissionId ?? null,
        })
        mentionsAdded++
      }

      graphCounts = {
        entities: extracted.entities.length + 1,
        edges: extracted.edges.length + mentionsAdded,
      }

      if (commissionId) {
        try {
          const syntheticMentions = Array.from(linkTargets).map((targetId) => ({
            src_canonical_id: articleEventId,
            dst_canonical_id: targetId,
            type: 'mentions' as const,
            properties: {},
            evidence: pickedItem.title,
            confidence: 0.7,
          }))
          const fired = await evaluateAndFire({
            commissionId,
            article: pickedItem,
            entities: extracted.entities,
            edges: [...extracted.edges, ...syntheticMentions],
          })
          if (fired.length > 0) addActivity('ALERT', `${fired.length} alert${fired.length === 1 ? '' : 's'} fired`)
        } catch (e) {
          addActivity('WARN', `alert engine failed: ${(e as Error).message}`)
        }
      }
    } catch (extractErr) {
      addActivity('WARN', `graph extraction failed: ${(extractErr as Error).message}`)
    }

    if (briefId !== null && commissionId) {
      try {
        const snapshot = {
          commission_id: commissionId,
          article_id: pickedItem.id,
          article_title: pickedItem.title,
          article_url: pickedItem.url,
          editorial: editorial.editorial,
          trace_id: source.trace?.request_id ?? null,
          ts: Date.now(),
        }
        const upload = await uploadJSON(snapshot)
        if (upload.hash) {
          db.query(`UPDATE briefs SET storage_hash = ? WHERE id = ?`).run(upload.hash, briefId)
        }
        addActivity('STORAGE', `${upload.reason} hash=${upload.hash.slice(0, 24)}`)
      } catch (e) {
        addActivity('WARN', `storage upload failed: ${(e as Error).message}`)
      }
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

function formatBriefMarkdown(item: NewsItem, take: string): string {
  const published = item.publishedAt ? new Date(item.publishedAt).toISOString() : 'unknown'
  return `**${item.title}**

${take}

— [${item.source.name}](${item.url}) · ${published}`
}

function filterByTerms(items: NewsItem[], terms: string[]): NewsItem[] {
  if (!terms.length) return items
  const lower = terms.map((t) => t.toLowerCase())
  return items.filter((item) => {
    const hay = `${item.title} ${item.summary}`.toLowerCase()
    return lower.some((t) => hay.includes(t))
  })
}

function mergeAndDedupe(prefer: NewsItem[], fallback: NewsItem[]): NewsItem[] {
  const seen = new Set<string>()
  const out: NewsItem[] = []
  for (const arr of [prefer, fallback]) {
    for (const item of arr) {
      const key = item.url || item.id
      if (seen.has(key)) continue
      seen.add(key)
      out.push(item)
    }
  }
  return out
}
