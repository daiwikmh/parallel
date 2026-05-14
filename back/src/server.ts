import './lib/env'
import express, { Request, Response, NextFunction } from 'express'
import newsRouter from './api/news.router'
import agentRouter from './api/agent.router'
import commissionsRouter from './api/commissions.router'
import graphRouter from './api/graph.router'

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
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

app.use('/api/news', newsRouter)
app.use('/api/agent', agentRouter)
app.use('/api/commissions', commissionsRouter)
app.use('/api/graph', graphRouter)

// Auth router intentionally not mounted yet: middleware/jwt is missing.

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[unhandled]', err)
  res.status(500).json({ error: err.message })
})

app.listen(PORT, () => {
  console.log(`OG Times backend listening on http://localhost:${PORT}`)
  console.log(`CORS allowed origins: ${ALLOWED_ORIGINS.join(', ')}`)
})
