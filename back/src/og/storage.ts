import { FLAGS, STORAGE_CONFIG } from '../lib/flags'
import crypto from 'crypto'
import { ethers } from 'ethers'
import { Indexer, MemData } from '@0gfoundation/0g-storage-ts-sdk'

export interface StorageUploadResult {
  hash: string
  size: number
  uploaded: boolean
  reason: 'ok' | 'flag-off' | 'no-config' | 'error'
  error?: string
  txHash?: string
}

type ZgClient = { indexer: Indexer; signer: ethers.Wallet }
let cachedClient: ZgClient | null = null

function getClient(): ZgClient {
  if (cachedClient) return cachedClient
  const provider = new ethers.JsonRpcProvider(STORAGE_CONFIG.rpcUrl)
  const signer = new ethers.Wallet(STORAGE_CONFIG.privateKey, provider)
  const indexer = new Indexer(STORAGE_CONFIG.indexerUrl)
  cachedClient = { indexer, signer }
  return cachedClient
}

export async function uploadJSON(obj: unknown): Promise<StorageUploadResult> {
  const json = JSON.stringify(obj)
  const buf = Buffer.from(json, 'utf8')
  const size = buf.byteLength
  const localHash = sha256(json)

  if (!FLAGS.OG_STORAGE_ENABLED) {
    return { hash: `local:${localHash}`, size, uploaded: false, reason: 'flag-off' }
  }
  if (!STORAGE_CONFIG.privateKey) {
    return { hash: `local:${localHash}`, size, uploaded: false, reason: 'no-config' }
  }

  try {
    const { indexer, signer } = getClient()
    const file = new MemData(buf)
    const [, treeErr] = await file.merkleTree()
    if (treeErr) throw treeErr
    const [res, uploadErr] = await indexer.upload(file, STORAGE_CONFIG.rpcUrl, signer, {
      expectedReplica: STORAGE_CONFIG.expectedReplica,
      skipIfFinalized: true,
      finalityRequired: false,
    })
    if (uploadErr || !res) throw uploadErr ?? new Error('upload returned no result')
    const rootHash = 'rootHash' in res ? res.rootHash : res.rootHashes[0]
    const txHash = 'txHash' in res ? res.txHash : res.txHashes[0]
    return { hash: `0g:${rootHash}`, size, uploaded: true, reason: 'ok', txHash }
  } catch (e) {
    const raw = (e as Error).message ?? String(e)
    const msg = raw.split('\n')[0].slice(0, 200)
    return { hash: `local:${localHash}`, size, uploaded: false, reason: 'error', error: msg }
  }
}

function sha256(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex').slice(0, 32)
}
