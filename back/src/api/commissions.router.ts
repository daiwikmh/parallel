import { Router, Request, Response } from 'express'
import { classifyQuery } from '../agent/classify'
import { createCommission, listCommissions, getCommission, upsertEntity, insertTrace, getGraphForCommission } from '../db/repo'
import { runAgentOnce, isRunning } from '../agent/run'
import { db } from '../db/client'
import { isAvailable as inferenceAvailable } from '../og/compute'

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

    upsertEntity({
      canonical_id: cls.canonical_id,
      type: cls.type,
      name: cls.canonical_name,
      aliases: cls.aliases,
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
  try {
    const result = await runAgentOnce({ commissionId: c.id })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
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
