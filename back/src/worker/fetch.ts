import type { INewsProvider, NewsItem, ProviderResult } from '../lib/types'
import { defaultProviders } from './providers'
import { dedupe } from './dedupe'
import { rankItems, pickBest } from './score'

export interface FetchOptions {
  providers?: INewsProvider[]
  providerTimeoutMs?: number
}

export interface FetchReport {
  items: NewsItem[]
  ranked: NewsItem[]
  providerResults: ProviderResult[]
}

const DEFAULT_PROVIDER_TIMEOUT_MS = 30_000

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} exceeded ${ms}ms`)), ms)
    p.then(v => { clearTimeout(t); resolve(v) }, e => { clearTimeout(t); reject(e) })
  })
}

export async function fetchAllSources(opts: FetchOptions = {}): Promise<FetchReport> {
  const providers = opts.providers ?? defaultProviders()
  const timeoutMs = opts.providerTimeoutMs ?? DEFAULT_PROVIDER_TIMEOUT_MS

  const settled = await Promise.allSettled(
    providers.map(p => withTimeout(p.fetch(), timeoutMs, `[${p.name}] fetch`)),
  )

  const providerResults: ProviderResult[] = settled.map((r, i) => {
    const p = providers[i]
    if (r.status === 'fulfilled') {
      return { provider: p.name, kind: p.kind, ok: true, items: r.value }
    }
    return {
      provider: p.name,
      kind: p.kind,
      ok: false,
      items: [],
      error: (r.reason as Error)?.message ?? String(r.reason),
    }
  })

  const flat = providerResults.flatMap(r => r.items)
  const unique = dedupe(flat)
  const ranked = rankItems(unique)

  return { items: unique, ranked, providerResults }
}

export { rankItems, pickBest, dedupe }
