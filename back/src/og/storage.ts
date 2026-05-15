import { FLAGS, STORAGE_CONFIG } from '../lib/flags'
import crypto from 'crypto'

export interface StorageUploadResult {
  hash: string
  size: number
  uploaded: boolean
  reason: 'ok' | 'flag-off' | 'no-config' | 'error'
  error?: string
}

export async function uploadJSON(obj: unknown): Promise<StorageUploadResult> {
  const json = JSON.stringify(obj)
  const size = Buffer.byteLength(json, 'utf8')
  const localHash = sha256(json)

  if (!FLAGS.OG_STORAGE_ENABLED) {
    return { hash: `local:${localHash}`, size, uploaded: false, reason: 'flag-off' }
  }
  if (!STORAGE_CONFIG.endpoint || !STORAGE_CONFIG.privateKey) {
    return { hash: `local:${localHash}`, size, uploaded: false, reason: 'no-config' }
  }

  return { hash: `pending:${localHash}`, size, uploaded: false, reason: 'error', error: 'real SDK not wired yet' }
}

function sha256(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex').slice(0, 32)
}
