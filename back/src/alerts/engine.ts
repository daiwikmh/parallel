import {
  listActiveAlertRules,
  insertAlertEvent,
  markAlertFired,
  getCommission,
  getEntity,
  getTelegramChatIdFor,
  type AlertRuleRow,
  type AlertKind,
} from '../db/repo'
import type { ExtractedEntity, ExtractedEdge } from '../agent/extract'
import type { NewsItem } from '../lib/types'

export interface AlertContext {
  commissionId: string
  article: NewsItem
  entities: ExtractedEntity[]
  edges: ExtractedEdge[]
}

export interface AlertPayload {
  rule_id: number
  kind: AlertKind
  commission_id: string
  article_title: string
  article_url: string
  message: string
  matched: Record<string, unknown>
  fired_at: number
}

export async function evaluateAndFire(ctx: AlertContext): Promise<AlertPayload[]> {
  const rules = listActiveAlertRules(ctx.commissionId)
  const fired: AlertPayload[] = []
  for (const rule of rules) {
    if (!cooldownReady(rule)) continue
    const match = evaluateRule(rule, ctx)
    if (!match) continue
    const payload: AlertPayload = {
      rule_id: rule.id,
      kind: rule.kind,
      commission_id: ctx.commissionId,
      article_title: ctx.article.title,
      article_url: ctx.article.url,
      message: match.message,
      matched: match.matched,
      fired_at: Date.now(),
    }
    const deliveredTo = await deliver(rule, ctx, payload)
    insertAlertEvent(rule.id, payload as unknown as Record<string, unknown>, deliveredTo)
    markAlertFired(rule.id)
    fired.push(payload)
  }
  return fired
}

function cooldownReady(rule: AlertRuleRow): boolean {
  if (!rule.last_fired_at) return true
  const elapsedMs = Date.now() - rule.last_fired_at
  return elapsedMs >= rule.cooldown_seconds * 1000
}

interface RuleMatch {
  message: string
  matched: Record<string, unknown>
}

function evaluateRule(rule: AlertRuleRow, ctx: AlertContext): RuleMatch | null {
  const cfg = parseConfig(rule.config)
  switch (rule.kind) {
    case 'entity_mentioned': {
      const target = String(cfg.entity_id ?? '').toLowerCase()
      if (!target) return null
      const hit = ctx.entities.find((e) => e.canonical_id.toLowerCase() === target)
      if (!hit) return null
      return {
        message: `${hit.name} mentioned in article: "${ctx.article.title}"`,
        matched: { entity_id: hit.canonical_id, entity_name: hit.name },
      }
    }
    case 'edge_type_added': {
      const types = (cfg.edge_types as string[] | undefined)?.map((t) => t.toLowerCase()) ?? []
      if (!types.length) return null
      const hits = ctx.edges.filter((e) => types.includes(e.type.toLowerCase()))
      if (!hits.length) return null
      const summary = hits.map((h) => `${h.type}(${h.src_canonical_id} → ${h.dst_canonical_id})`).join(', ')
      return {
        message: `New edge${hits.length > 1 ? 's' : ''}: ${summary}`,
        matched: { edges: hits.map((h) => ({ type: h.type, src: h.src_canonical_id, dst: h.dst_canonical_id, evidence: h.evidence })) },
      }
    }
    case 'keyword_in_evidence': {
      const keywords = (cfg.keywords as string[] | undefined)?.map((k) => k.toLowerCase()) ?? []
      if (!keywords.length) return null
      const hits = ctx.edges.filter((e) => keywords.some((k) => e.evidence.toLowerCase().includes(k)))
      if (!hits.length) return null
      return {
        message: `Keyword match in evidence: ${hits[0].evidence.slice(0, 200)}`,
        matched: { count: hits.length, sample: hits[0].evidence.slice(0, 300) },
      }
    }
    case 'sentiment_drop': {
      const targetId = String(cfg.entity_id ?? '').toLowerCase()
      const threshold = typeof cfg.threshold === 'number' ? cfg.threshold : 0.35
      if (!targetId) return null
      const hit = ctx.entities.find((e) => e.canonical_id.toLowerCase() === targetId)
      if (!hit || typeof hit.sentiment !== 'number') return null
      if (hit.sentiment > threshold) return null
      return {
        message: `Sentiment for ${hit.name} dropped to ${hit.sentiment.toFixed(2)} (threshold ${threshold})`,
        matched: { entity_id: hit.canonical_id, sentiment: hit.sentiment, threshold },
      }
    }
    default:
      return null
  }
}

function parseConfig(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return {}
  }
}

async function deliver(rule: AlertRuleRow, ctx: AlertContext, payload: AlertPayload): Promise<string[]> {
  const delivered: string[] = ['in-app']

  const cfg = parseConfig(rule.config)
  const webhookUrl = typeof cfg.webhook_url === 'string' ? cfg.webhook_url : null

  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5_000),
      })
      delivered.push('webhook')
    } catch (e) {
      delivered.push(`webhook:err:${(e as Error).message.slice(0, 80)}`)
    }
  }

  const commission = getCommission(ctx.commissionId)
  if (commission) {
    const owner = commission.owner_id
    const chatId = getTelegramChatIdFor(owner) ?? getTelegramChatIdFor('anon')
    if (chatId) {
      const tgResult = await sendTelegram(chatId, formatTelegramMessage(payload))
      delivered.push(tgResult)
    }
  }

  return delivered
}

function formatTelegramMessage(p: AlertPayload): string {
  const head = kindEmoji(p.kind) + ' ' + p.message
  return `${head}\n\n${p.article_title}\n${p.article_url}`
}

function kindEmoji(kind: AlertKind): string {
  switch (kind) {
    case 'entity_mentioned': return '[MENTION]'
    case 'edge_type_added': return '[EDGE]'
    case 'keyword_in_evidence': return '[KEYWORD]'
    case 'sentiment_drop': return '[SENTIMENT]'
  }
}

async function sendTelegram(chatId: string, text: string): Promise<string> {
  const token = process.env.TG_BOT_TOKEN
  if (!token) return 'telegram:no-token'
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(7_000),
    })
    const body = (await r.json()) as { ok?: boolean; description?: string }
    return body.ok ? 'telegram' : `telegram:err:${body.description?.slice(0, 60) ?? 'unknown'}`
  } catch (e) {
    return `telegram:err:${(e as Error).message.slice(0, 60)}`
  }
}
