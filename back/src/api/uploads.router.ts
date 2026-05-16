import { Router, Request, Response } from 'express'
import multer from 'multer'
import Papa from 'papaparse'
import crypto from 'crypto'
import { getCommission, createUpload, getUpload, listUploadsForCommission, updateUploadProgress } from '../db/repo'
import { uploadJSON } from '../og/storage'
import { processUploadAsync } from '../worker/uploadProcessor'
import { addActivity } from '../agent/activity'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1_000_000 },
})

const router: Router = Router()

router.get('/:commissionId', (req: Request, res: Response) => {
  const c = getCommission(req.params.commissionId)
  if (!c) {
    res.status(404).json({ error: 'commission not found' })
    return
  }
  res.json({ uploads: listUploadsForCommission(c.id) })
})

router.get('/:commissionId/:uploadId', (req: Request, res: Response) => {
  const c = getCommission(req.params.commissionId)
  if (!c) {
    res.status(404).json({ error: 'commission not found' })
    return
  }
  const u = getUpload(req.params.uploadId)
  if (!u || u.commission_id !== c.id) {
    res.status(404).json({ error: 'upload not found' })
    return
  }
  res.json({ upload: u })
})

router.post('/:commissionId', upload.single('file'), async (req: Request, res: Response) => {
  const c = getCommission(req.params.commissionId)
  if (!c) {
    res.status(404).json({ error: 'commission not found' })
    return
  }
  const file = (req as Request & { file?: Express.Multer.File }).file
  if (!file) {
    res.status(400).json({ error: "file required (field name 'file')" })
    return
  }

  const filename = file.originalname || 'upload.csv'
  const mime = file.mimetype || 'text/csv'
  if (!filename.toLowerCase().endsWith('.csv') && !mime.includes('csv')) {
    res.status(400).json({ error: 'only CSV uploads supported in v1' })
    return
  }

  const text = file.buffer.toString('utf8')
  const sha = crypto.createHash('sha256').update(file.buffer).digest('hex')

  let parsed: Papa.ParseResult<Record<string, string>>
  try {
    parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    })
  } catch (e) {
    res.status(400).json({ error: `CSV parse failed: ${(e as Error).message}` })
    return
  }

  const rows = parsed.data.filter((r) => Object.values(r).some((v) => typeof v === 'string' && v.trim().length > 0))
  if (!rows.length) {
    res.status(400).json({ error: 'no data rows after parse' })
    return
  }
  const headers = parsed.meta.fields ?? Object.keys(rows[0] ?? {})

  const storage = await uploadJSON({ filename, sha256: sha, rows })
  const storageUri = storage.hash

  const created = createUpload({
    commission_id: c.id,
    filename,
    mime,
    size: file.size,
    content_sha256: sha,
    storage_uri: storageUri,
    rows_total: rows.length,
  })
  updateUploadProgress(created.id, { status: 'processing' })
  addActivity('UPLOAD', `${filename} · ${rows.length} rows · ${storageUri.slice(0, 24)}`)

  processUploadAsync({
    uploadId: created.id,
    commissionId: c.id,
    rows: rows.slice(0, 20),
    headers,
  }).catch((e) => {
    updateUploadProgress(created.id, { status: 'failed', error: (e as Error).message })
  })

  res.status(202).json({
    upload_id: created.id,
    sha256: sha,
    storage_uri: storageUri,
    rows_total: rows.length,
    status: 'processing',
  })
})

export default router
