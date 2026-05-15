import { Router, Request, Response } from 'express'
import {
  createAlertRule,
  listAlertRules,
  updateAlertRule,
  deleteAlertRule,
  listAlertEvents,
  listRecentAlertEventsForCommission,
  getCommission,
  type AlertKind,
} from '../db/repo'

const router: Router = Router()

const KINDS: AlertKind[] = ['entity_mentioned', 'edge_type_added', 'keyword_in_evidence', 'sentiment_drop']

router.get('/:commissionId', (req: Request, res: Response) => {
  const c = getCommission(req.params.commissionId)
  if (!c) {
    res.status(404).json({ error: 'commission not found' })
    return
  }
  res.json({ rules: listAlertRules(c.id) })
})

router.post('/:commissionId', (req: Request, res: Response) => {
  const c = getCommission(req.params.commissionId)
  if (!c) {
    res.status(404).json({ error: 'commission not found' })
    return
  }
  const { kind, config, cooldown_seconds } = (req.body ?? {}) as {
    kind?: string
    config?: Record<string, unknown>
    cooldown_seconds?: number
  }
  if (typeof kind !== 'string' || !KINDS.includes(kind as AlertKind)) {
    res.status(400).json({ error: `kind must be one of ${KINDS.join(', ')}` })
    return
  }
  if (!config || typeof config !== 'object') {
    res.status(400).json({ error: 'config object required' })
    return
  }
  const rule = createAlertRule({
    commission_id: c.id,
    kind: kind as AlertKind,
    config,
    cooldown_seconds: typeof cooldown_seconds === 'number' ? cooldown_seconds : undefined,
  })
  res.status(201).json({ rule })
})

router.patch('/:commissionId/:ruleId', (req: Request, res: Response) => {
  const c = getCommission(req.params.commissionId)
  if (!c) {
    res.status(404).json({ error: 'commission not found' })
    return
  }
  const id = Number(req.params.ruleId)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: 'invalid rule id' })
    return
  }
  const { active, cooldown_seconds, config } = (req.body ?? {}) as {
    active?: number | boolean
    cooldown_seconds?: number
    config?: Record<string, unknown>
  }
  const patch: { active?: number; cooldown_seconds?: number; config?: Record<string, unknown> } = {}
  if (active !== undefined) patch.active = active ? 1 : 0
  if (typeof cooldown_seconds === 'number') patch.cooldown_seconds = cooldown_seconds
  if (config !== undefined) patch.config = config
  const updated = updateAlertRule(id, patch)
  if (!updated) {
    res.status(404).json({ error: 'rule not found' })
    return
  }
  res.json({ rule: updated })
})

router.delete('/:commissionId/:ruleId', (req: Request, res: Response) => {
  const id = Number(req.params.ruleId)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: 'invalid rule id' })
    return
  }
  deleteAlertRule(id)
  res.json({ ok: true })
})

router.get('/:commissionId/events', (req: Request, res: Response) => {
  const c = getCommission(req.params.commissionId)
  if (!c) {
    res.status(404).json({ error: 'commission not found' })
    return
  }
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 30))
  res.json({ events: listRecentAlertEventsForCommission(c.id, limit) })
})

router.get('/:commissionId/:ruleId/events', (req: Request, res: Response) => {
  const id = Number(req.params.ruleId)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: 'invalid rule id' })
    return
  }
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20))
  res.json({ events: listAlertEvents(id, limit) })
})

export default router
