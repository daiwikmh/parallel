import './lib/env'
import express, { Request, Response, NextFunction } from 'express'
import newsRouter from './api/news.router'
import agentRouter from './api/agent.router'
import commissionsRouter from './api/commissions.router'
import graphRouter from './api/graph.router'
import sourcesRouter from './api/sources.router'
import integrationsRouter from './api/integrations.router'
import alertsRouter from './api/alerts.router'
import uploadsRouter from './api/uploads.router'
import vaultRouter from './api/vault.router'
import { dumpFlags } from './lib/flags'
import { startPaymentEventListener } from './og/chain'
import { startTelegramBot } from './integrations/telegram-bot'

const app = express()
const PORT = Number(process.env.PORT ?? 4000)

const ALLOWED_ORIGINS = (process.env.FRONTEND_URL ?? 'http://localhost:3000')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Wallet-Address')
  if (req.method === 'OPTIONS') {
    res.sendStatus(204)
    return
  }
  next()
})

app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now() })
})

const INTERNAL_TOKEN = process.env.BACKEND_INTERNAL_TOKEN ?? ''
if (!INTERNAL_TOKEN) {
  console.warn('[security] BACKEND_INTERNAL_TOKEN not set — backend API is OPEN. Set it before exposing publicly.')
}

app.use((req: Request, res: Response, next: NextFunction) => {
  if (!req.path.startsWith('/api/')) {
    next()
    return
  }
  if (!INTERNAL_TOKEN) {
    next()
    return
  }
  const supplied = req.header('x-internal-token') ?? ''
  if (supplied && supplied === INTERNAL_TOKEN) {
    next()
    return
  }
  res.status(401).json({ error: 'unauthorized: missing or invalid X-Internal-Token' })
})

app.use('/api/news', newsRouter)
app.use('/api/agent', agentRouter)
app.use('/api/commissions', commissionsRouter)
app.use('/api/graph', graphRouter)
app.use('/api/sources', sourcesRouter)
app.use('/api/integrations', integrationsRouter)
app.use('/api/alerts', alertsRouter)
app.use('/api/uploads', uploadsRouter)
app.use('/api/vault', vaultRouter)

// Auth router intentionally not mounted yet: middleware/jwt is missing.

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[unhandled]', err)
  res.status(500).json({ error: err.message })
})

app.listen(PORT, () => {
  console.log(`Frame0 backend listening on http://localhost:${PORT}`)
  console.log(`CORS allowed origins: ${ALLOWED_ORIGINS.join(', ')}`)
  dumpFlags()
  startPaymentEventListener()
  startTelegramBot()
})
