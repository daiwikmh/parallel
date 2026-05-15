import { Router, Request, Response } from 'express'
import { runAgentOnce, getLastResult, isRunning } from '../agent/run'
import { getActivity } from '../agent/activity'
import { isAvailable as inferenceAvailable, DEFAULT_MODEL } from '../og/compute'
import { listAuditFeed, auditCounts, totalInferenceCostWei } from '../db/repo'
import { FLAGS } from '../lib/flags'

const router: Router = Router()

router.get('/audit', (req: Request, res: Response) => {
  const limit = Math.max(1, Math.min(500, Number(req.query.limit) || 100))
  res.json({
    events: listAuditFeed(limit),
    counts: auditCounts(),
    totals: { inference_cost_wei: totalInferenceCostWei() },
    flags: FLAGS,
    inference: { available: inferenceAvailable(), model: DEFAULT_MODEL },
  })
})

router.get('/status', (_req, res) => {
  res.json({
    inference: { available: inferenceAvailable(), model: DEFAULT_MODEL },
    running: isRunning(),
    lastResult: getLastResult(),
  })
})

router.get('/log', (req, res) => {
  const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 20))
  res.json({ events: getActivity(limit) })
})

router.get('/last', (_req, res) => {
  const last = getLastResult()
  if (!last) {
    res.status(404).json({ error: 'no agent run yet' })
    return
  }
  res.json(last)
})

router.post('/run', async (_req: Request, res: Response) => {
  if (!inferenceAvailable()) {
    res.status(503).json({ error: '0G inference not configured (set OG_INFERENCE_API)' })
    return
  }
  if (isRunning()) {
    res.status(409).json({ error: 'agent run already in progress' })
    return
  }
  try {
    const result = await runAgentOnce()
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

export default router
