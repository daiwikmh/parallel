import { Router, Request, Response } from 'express'
import {
  createSource,
  listSources,
  updateSource,
  deleteSource,
  getCommission,
  type SourceKind,
} from '../db/repo'

const router: Router = Router()

router.get('/:commissionId', (req: Request, res: Response) => {
  const c = getCommission(req.params.commissionId)
  if (!c) {
    res.status(404).json({ error: 'commission not found' })
    return
  }
  res.json({ sources: listSources(c.id) })
})

router.post('/:commissionId', (req: Request, res: Response) => {
  const c = getCommission(req.params.commissionId)
  if (!c) {
    res.status(404).json({ error: 'commission not found' })
    return
  }
  const { kind, url, label } = (req.body ?? {}) as { kind?: string; url?: string; label?: string }
  if (kind !== 'rss' && kind !== 'youtube') {
    res.status(400).json({ error: "kind must be 'rss' or 'youtube'" })
    return
  }
  if (typeof url !== 'string' || !url.trim()) {
    res.status(400).json({ error: 'url required' })
    return
  }
  const created = createSource({
    commission_id: c.id,
    kind: kind as SourceKind,
    url: url.trim(),
    label: typeof label === 'string' && label.trim() ? label.trim() : null,
  })
  res.status(201).json({ source: created })
})

router.patch('/:commissionId/:sourceId', (req: Request, res: Response) => {
  const c = getCommission(req.params.commissionId)
  if (!c) {
    res.status(404).json({ error: 'commission not found' })
    return
  }
  const id = Number(req.params.sourceId)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: 'invalid source id' })
    return
  }
  const { active, preference, label } = (req.body ?? {}) as { active?: number; preference?: number; label?: string | null }
  const patch: { active?: number; preference?: number; label?: string | null } = {}
  if (typeof active === 'number') patch.active = active ? 1 : 0
  if (typeof preference === 'number') patch.preference = Math.max(-1, Math.min(1, preference))
  if (label !== undefined) patch.label = label
  const updated = updateSource(id, patch)
  if (!updated) {
    res.status(404).json({ error: 'source not found' })
    return
  }
  res.json({ source: updated })
})

router.delete('/:commissionId/:sourceId', (req: Request, res: Response) => {
  const id = Number(req.params.sourceId)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: 'invalid source id' })
    return
  }
  deleteSource(id)
  res.json({ ok: true })
})

export default router
