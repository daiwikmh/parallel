import { fetchAllSources, FetchReport, FetchOptions } from './fetch'

interface CacheEntry {
  data: FetchReport
  fetchedAt: number
}

let entry: CacheEntry | null = null
let inflight: Promise<FetchReport> | null = null

const DEFAULT_TTL_MS = 60_000

export interface CacheOptions extends FetchOptions {
  ttlMs?: number
  force?: boolean
}

export async function getCachedNews(opts: CacheOptions = {}): Promise<FetchReport & { cachedAt: number; ageMs: number }> {
  const ttl = opts.ttlMs ?? DEFAULT_TTL_MS
  const now = Date.now()

  if (!opts.force && entry && now - entry.fetchedAt < ttl) {
    return { ...entry.data, cachedAt: entry.fetchedAt, ageMs: now - entry.fetchedAt }
  }

  if (inflight) {
    const data = await inflight
    return { ...data, cachedAt: entry?.fetchedAt ?? now, ageMs: Date.now() - (entry?.fetchedAt ?? now) }
  }

  inflight = fetchAllSources({ providers: opts.providers })
    .then(data => {
      entry = { data, fetchedAt: Date.now() }
      return data
    })
    .finally(() => {
      inflight = null
    })

  const data = await inflight
  return { ...data, cachedAt: entry!.fetchedAt, ageMs: 0 }
}

export function invalidateCache(): void {
  entry = null
}
