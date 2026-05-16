import { Router, Request, Response } from 'express'
import { db } from '../db/client'
import { FLAGS } from '../lib/flags'

const router: Router = Router()

interface VaultBriefRow {
  id: number
  commission_id: string
  commission_query: string
  article_id: string | null
  storage_hash: string | null
  trace_id: string | null
  created_at: number
  body_excerpt: string
}

interface VaultUploadRow {
  id: string
  commission_id: string
  commission_query: string
  filename: string
  size: number
  content_sha256: string
  storage_uri: string | null
  rows_total: number
  rows_processed: number
  entities_added: number
  edges_added: number
  status: string
  created_at: number
}

interface VaultStats {
  briefs_total: number
  briefs_anchored: number
  uploads_total: number
  uploads_anchored: number
  bytes_total: number
}

router.get('/', (req: Request, res: Response) => {
  const commissionId = typeof req.query.commission === 'string' ? req.query.commission : null
  const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 100))

  const briefParams: (string | number)[] = []
  let briefSql = `
    SELECT
      b.id,
      b.commission_id,
      c.query_text AS commission_query,
      b.article_id,
      b.storage_hash,
      b.trace_id,
      b.created_at,
      SUBSTR(b.body_md, 1, 200) AS body_excerpt
    FROM briefs b
    LEFT JOIN commissions c ON c.id = b.commission_id
    WHERE b.storage_hash IS NOT NULL
  `
  if (commissionId) {
    briefSql += ` AND b.commission_id = ?`
    briefParams.push(commissionId)
  }
  briefSql += ` ORDER BY b.created_at DESC LIMIT ?`
  briefParams.push(limit)

  const briefs = db.query<VaultBriefRow, any[]>(briefSql).all(...briefParams)

  const uploadParams: (string | number)[] = []
  let uploadSql = `
    SELECT
      u.id, u.commission_id,
      c.query_text AS commission_query,
      u.filename, u.size, u.content_sha256, u.storage_uri,
      u.rows_total, u.rows_processed, u.entities_added, u.edges_added,
      u.status, u.created_at
    FROM uploads u
    LEFT JOIN commissions c ON c.id = u.commission_id
    WHERE 1=1
  `
  if (commissionId) {
    uploadSql += ` AND u.commission_id = ?`
    uploadParams.push(commissionId)
  }
  uploadSql += ` ORDER BY u.created_at DESC LIMIT ?`
  uploadParams.push(limit)

  const uploads = db.query<VaultUploadRow, any[]>(uploadSql).all(...uploadParams)

  const stats: VaultStats = {
    briefs_total: db.query<{ n: number }, []>(`SELECT COUNT(*) AS n FROM briefs WHERE storage_hash IS NOT NULL`).get()?.n ?? 0,
    briefs_anchored: db.query<{ n: number }, []>(`SELECT COUNT(*) AS n FROM briefs WHERE storage_hash LIKE '0g:%'`).get()?.n ?? 0,
    uploads_total: db.query<{ n: number }, []>(`SELECT COUNT(*) AS n FROM uploads`).get()?.n ?? 0,
    uploads_anchored: db.query<{ n: number }, []>(`SELECT COUNT(*) AS n FROM uploads WHERE storage_uri LIKE '0g:%'`).get()?.n ?? 0,
    bytes_total: db.query<{ n: number }, []>(`SELECT COALESCE(SUM(size), 0) AS n FROM uploads`).get()?.n ?? 0,
  }

  res.json({
    briefs,
    uploads,
    stats,
    flags: { OG_STORAGE_ENABLED: FLAGS.OG_STORAGE_ENABLED },
  })
})

export default router
