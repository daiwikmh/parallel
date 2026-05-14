import { Router, Request, Response } from 'express'
import { getCachedNews, invalidateCache } from '../worker/cache'

const router: Router = Router()

router.get('/', async (req: Request, res: Response) => {
  const limit = clampInt(req.query.limit, 50, 1, 200)
  const ttlMs = clampInt(req.query.ttl, 60_000, 0, 600_000)
  const force = req.query.force === '1' || req.query.force === 'true'

  try {
    const report = await getCachedNews({ ttlMs, force })
    res.json({
      cachedAt: report.cachedAt,
      ageMs: report.ageMs,
      total: report.ranked.length,
      providers: report.providerResults.map(r => ({
        provider: r.provider,
        kind: r.kind,
        ok: r.ok,
        count: r.items.length,
        error: r.error,
      })),
      items: report.ranked.slice(0, limit),
    })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

router.get('/best', async (_req: Request, res: Response) => {
  try {
    const report = await getCachedNews()
    const best = report.ranked[0] ?? null
    res.json({ cachedAt: report.cachedAt, ageMs: report.ageMs, item: best })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

router.get('/status', async (_req: Request, res: Response) => {
  try {
    const report = await getCachedNews()
    res.json({
      cachedAt: report.cachedAt,
      ageMs: report.ageMs,
      total: report.ranked.length,
      providers: report.providerResults.map(r => ({
        provider: r.provider,
        kind: r.kind,
        ok: r.ok,
        count: r.items.length,
        error: r.error,
      })),
    })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

router.post('/refresh', async (_req: Request, res: Response) => {
  invalidateCache()
  try {
    const report = await getCachedNews({ force: true })
    res.json({ refreshedAt: report.cachedAt, total: report.ranked.length })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

function clampInt(raw: unknown, fallback: number, min: number, max: number): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.floor(n)))
}

export default router
