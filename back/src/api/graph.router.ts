import { Router, Request, Response } from 'express'
import { getGraphForCommission, getEntity, edgesForEntity } from '../db/repo'

const router: Router = Router()

router.get('/', (req: Request, res: Response) => {
  const commission = req.query.commission
  const sinceRaw = req.query.since
  if (typeof commission !== 'string' || commission.length === 0) {
    res.status(400).json({ error: 'commission query parameter is required' })
    return
  }
  const since = typeof sinceRaw === 'string' ? Number(sinceRaw) : undefined
  const graph = getGraphForCommission(commission, Number.isFinite(since) ? since : undefined)
  res.json(graph)
})

router.get('/entities/:id', (req: Request, res: Response) => {
  const ent = getEntity(req.params.id)
  if (!ent) {
    res.status(404).json({ error: 'entity not found' })
    return
  }
  const edges = edgesForEntity(ent.id, 100)
  res.json({
    entity: {
      id: ent.id,
      type: ent.type,
      canonical_name: ent.canonical_name,
      aliases: JSON.parse(ent.aliases) as string[],
      attributes: JSON.parse(ent.attributes) as Record<string, unknown>,
    },
    edges: edges.map((e) => ({
      id: e.id,
      src_id: e.src_id,
      dst_id: e.dst_id,
      type: e.type,
      evidence: e.evidence,
      observed_at: e.observed_at,
      confidence: e.confidence,
      article_id: e.article_id,
      properties: JSON.parse(e.properties) as Record<string, unknown>,
    })),
  })
})

export default router
