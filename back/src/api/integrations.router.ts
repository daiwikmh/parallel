import { Router, Request, Response } from 'express'
import { db, now } from '../db/client'

const router: Router = Router()

interface ChannelRow {
  id: number
  owner_id: string
  kind: string
  target: string
  config: string
  active: number
  created_at: number
}

function ownerId(req: Request): string {
  const wallet = (req.header('x-wallet-address') || '').toLowerCase()
  return wallet || 'anon'
}

router.get('/telegram', (req: Request, res: Response) => {
  const owner = ownerId(req)
  const rows = db
    .query<ChannelRow, [string]>(
      `SELECT * FROM delivery_channels WHERE owner_id = ? AND kind = 'telegram' ORDER BY created_at DESC LIMIT 1`,
    )
    .all(owner)
  res.json({ channel: rows[0] ?? null })
})

router.post('/telegram', (req: Request, res: Response) => {
  const owner = ownerId(req)
  const { chat_id } = (req.body ?? {}) as { chat_id?: string }
  if (typeof chat_id !== 'string' || !chat_id.trim()) {
    res.status(400).json({ error: 'chat_id required' })
    return
  }
  const t = now()
  db.query(`DELETE FROM delivery_channels WHERE owner_id = ? AND kind = 'telegram'`).run(owner)
  const result = db
    .query(
      `INSERT INTO delivery_channels (owner_id, kind, target, config, active, created_at)
       VALUES (?, 'telegram', ?, '{}', 1, ?)`,
    )
    .run(owner, chat_id.trim(), t)
  res.status(201).json({
    channel: {
      id: Number(result.lastInsertRowid),
      owner_id: owner,
      kind: 'telegram',
      target: chat_id.trim(),
      config: '{}',
      active: 1,
      created_at: t,
    },
  })
})

router.delete('/telegram', (req: Request, res: Response) => {
  const owner = ownerId(req)
  db.query(`DELETE FROM delivery_channels WHERE owner_id = ? AND kind = 'telegram'`).run(owner)
  res.json({ ok: true })
})

router.post('/telegram/test', async (req: Request, res: Response) => {
  const owner = ownerId(req)
  const row = db
    .query<ChannelRow, [string]>(
      `SELECT * FROM delivery_channels WHERE owner_id = ? AND kind = 'telegram' AND active = 1 LIMIT 1`,
    )
    .get(owner)
  if (!row) {
    res.status(404).json({ error: 'no telegram channel saved' })
    return
  }
  const token = process.env.TG_BOT_TOKEN
  if (!token) {
    res.json({
      ok: false,
      reason: 'TG_BOT_TOKEN not set on backend; chat_id stored but no bot to send from',
      chat_id: row.target,
    })
    return
  }
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: row.target,
        text: 'OG Times — test message. If you see this, Telegram delivery is wired.',
      }),
    })
    const body = (await r.json()) as { ok?: boolean; description?: string }
    res.json({ ok: !!body.ok, telegram: body })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

export default router
