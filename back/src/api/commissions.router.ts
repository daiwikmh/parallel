import { Router, Request, Response } from 'express'
import { classifyQuery } from '../agent/classify'
import {
  createCommission,
  listCommissions,
  getCommission,
  upsertEntity,
  insertTrace,
  getGraphForCommission,
  listBriefsForCommission,
  getDigestData,
} from '../db/repo'
import { runCommissionBatch, isRunning } from '../agent/run'
import { db } from '../db/client'
import { isAvailable as inferenceAvailable } from '../og/compute'
import { refreshTokenPrice } from '../worker/priceData'
import { describeAccess, consumeFreeUse } from '../payment/access'
import { FLAGS } from '../lib/flags'
import { chat as chatLLM } from '../og/compute'

const router: Router = Router()

router.post('/', async (req: Request, res: Response) => {
  if (!inferenceAvailable()) {
    res.status(503).json({ error: '0G inference not configured' })
    return
  }
  const { query, thesis } = (req.body ?? {}) as { query?: string; thesis?: string }
  if (typeof query !== 'string' || query.trim().length === 0) {
    res.status(400).json({ error: 'query is required' })
    return
  }
  try {
    const { result: cls, source } = await classifyQuery(query)
    if (source.trace) insertTrace({ trace: source.trace, model: source.model, kind: 'chat' })

    let attributes: Record<string, unknown> | undefined
    if (cls.type === 'token' || cls.type === 'protocol') {
      const price = await refreshTokenPrice(cls.canonical_name)
      if (price) attributes = { price }
    }

    upsertEntity({
      canonical_id: cls.canonical_id,
      type: cls.type,
      name: cls.canonical_name,
      aliases: cls.aliases,
      attributes,
    })

    const commission = createCommission({
      query_text: query.trim(),
      entity_id: cls.canonical_id,
      entity_type: cls.type,
      thesis: thesis?.trim() || null,
    })

    res.status(201).json({ commission, classification: cls })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

router.get('/', (_req, res) => {
  res.json({ commissions: listCommissions() })
})

router.get('/:id', (req, res) => {
  const c = getCommission(req.params.id)
  if (!c) {
    res.status(404).json({ error: 'commission not found' })
    return
  }
  const graph = getGraphForCommission(c.id)
  res.json({ commission: c, graph })
})

router.post('/:id/run', async (req: Request, res: Response) => {
  const c = getCommission(req.params.id)
  if (!c) {
    res.status(404).json({ error: 'commission not found' })
    return
  }
  if (isRunning()) {
    res.status(409).json({ error: 'agent run already in progress' })
    return
  }
  const wallet = (req.header('x-wallet-address') || '').toLowerCase() || null
  const access = describeAccess(wallet, c.id)
  if (!access.allowed) {
    res.status(402).json({
      error: 'payment required',
      access,
      flags: FLAGS,
    })
    return
  }
  const limit = Math.max(1, Math.min(8, Number(req.query.limit) || 3))
  try {
    const result = await runCommissionBatch(c.id, limit)
    if (FLAGS.PAYMENT_ENABLED && wallet && access.reason === 'free-tier') {
      consumeFreeUse(wallet)
    }
    res.json({ ...result, access: describeAccess(wallet, c.id) })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

router.get('/:id/access', (req: Request, res: Response) => {
  const c = getCommission(req.params.id)
  if (!c) {
    res.status(404).json({ error: 'commission not found' })
    return
  }
  const wallet = (req.header('x-wallet-address') || '').toLowerCase() || null
  res.json({ access: describeAccess(wallet, c.id), flags: FLAGS })
})

router.get('/:id/briefs', (req, res) => {
  const c = getCommission(req.params.id)
  if (!c) {
    res.status(404).json({ error: 'commission not found' })
    return
  }
  const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 20))
  res.json({ briefs: listBriefsForCommission(c.id, limit) })
})

router.get('/:id/digest', (req, res) => {
  const c = getCommission(req.params.id)
  if (!c) {
    res.status(404).json({ error: 'commission not found' })
    return
  }
  const sinceParam = Number(req.query.since)
  const sinceMs = Number.isFinite(sinceParam) && sinceParam > 0 ? sinceParam : Date.now() - 24 * 60 * 60 * 1000
  const data = getDigestData(c.id, sinceMs)
  const md = formatDigestMarkdown(c.query_text, data)
  res.json({ ...data, query_text: c.query_text, markdown: md })
})

function formatDigestMarkdown(
  query: string,
  d: ReturnType<typeof getDigestData>,
): string {
  const sinceISO = new Date(d.since).toISOString()
  const lines: string[] = []
  lines.push(`# Digest — ${query}`)
  lines.push(`_Since ${sinceISO}_`)
  lines.push('')
  lines.push(`**${d.brief_count} new brief${d.brief_count === 1 ? '' : 's'} · ${d.new_entities.length} new entit${d.new_entities.length === 1 ? 'y' : 'ies'} · ${d.new_edges_count} new edge${d.new_edges_count === 1 ? '' : 's'}**`)
  lines.push('')
  if (d.briefs.length > 0) {
    lines.push('## Briefs')
    for (const b of d.briefs) {
      lines.push('')
      lines.push(b.body_md)
      lines.push('')
      lines.push('---')
    }
  }
  if (d.new_entities.length > 0) {
    lines.push('')
    lines.push('## New entities')
    for (const e of d.new_entities) lines.push(`- \`${e.type}\` ${e.name}`)
  }
  if (d.top_sources.length > 0) {
    lines.push('')
    lines.push('## Top sources')
    for (const s of d.top_sources) lines.push(`- ${s.name} (${s.count})`)
  }
  return lines.join('\n')
}

router.get('/:id/brief-7d', async (req: Request, res: Response) => {
  const c = getCommission(req.params.id)
  if (!c) {
    res.status(404).json({ error: 'commission not found' })
    return
  }
  const sinceMs = Date.now() - 7 * 24 * 60 * 60 * 1000
  const data = getDigestData(c.id, sinceMs)
  if (data.briefs.length === 0) {
    res.json({
      commission_id: c.id,
      query_text: c.query_text,
      since: sinceMs,
      brief_count: 0,
      summary: '_No briefs in the last 7 days. Run the agent on this commission first._',
    })
    return
  }
  const bulletList = data.briefs
    .slice(0, 12)
    .map((b, i) => `(${i + 1}) ${b.body_md.replace(/\s+/g, ' ').slice(0, 400)}`)
    .join('\n\n')
  const entityList = data.new_entities.map((e) => `${e.type}:${e.name}`).join(', ')
  const system = `You write executive briefings for analysts who follow a single topic across many news sources.
Your job: condense N short editorial takes into ONE tight paragraph (4-6 sentences) that surfaces the most important shifts.
Rules:
- Do not list. Write prose.
- Lead with the single most important development.
- Name people, protocols, jurisdictions explicitly.
- Skeptical voice. No hedging. No platitudes.
- Do not invent facts not present in the input.`
  const user = `Topic: ${c.query_text}
Period: last 7 days
New entities surfaced: ${entityList || '(none)'}
New edges: ${data.new_edges_count}

Briefs to condense:
${bulletList}

Write the 7-day briefing paragraph now.`

  try {
    const result = await chatLLM(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { temperature: 0.5, maxTokens: 500 },
    )
    res.json({
      commission_id: c.id,
      query_text: c.query_text,
      since: sinceMs,
      brief_count: data.briefs.length,
      new_entities: data.new_entities.length,
      new_edges: data.new_edges_count,
      summary: result.text.trim(),
      trace_id: result.trace?.request_id ?? null,
    })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.delete('/:id', (req, res) => {
  const c = getCommission(req.params.id)
  if (!c) {
    res.status(404).json({ error: 'commission not found' })
    return
  }
  db.query(`UPDATE commissions SET status = 'dropped', dropped_at = ? WHERE id = ?`).run(Date.now(), c.id)
  res.json({ ok: true })
})

export default router
