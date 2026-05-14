import type { NewsItem } from '../lib/types'

export const BOOST_TERMS = [
  'ai', 'llm', 'model', 'openai', 'anthropic', 'agent',
  'crypto', 'bitcoin', 'ethereum', 'blockchain', 'web3', 'defi',
  'gpu', 'nvidia', 'startup', 'raises', 'funding',
  '0g', 'decentralized',
]

// Weighted score: term hits + log of signal strength + freshness bonus.
export function scoreItem(item: NewsItem, now = Date.now()): number {
  const text = `${item.title} ${item.summary}`.toLowerCase()
  const termHits = BOOST_TERMS.reduce((s, t) => s + (text.includes(t) ? 1 : 0), 0)

  const sig = item.signals ?? {}
  const signalScore =
    log1p(sig.upvotes) * 0.5 +
    log1p(sig.comments) * 0.3 +
    log1p(sig.stars) * 0.6

  const ageHours = (now - new Date(item.publishedAt).getTime()) / 36e5
  const freshness = ageHours < 24 ? 2 : ageHours < 72 ? 1 : 0

  return termHits + signalScore + freshness
}

export function rankItems(items: NewsItem[]): NewsItem[] {
  const now = Date.now()
  return [...items]
    .map(i => ({ ...i, score: scoreItem(i, now) }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
}

export function pickBest(items: NewsItem[]): NewsItem | null {
  if (!items.length) return null
  return rankItems(items)[0]
}

function log1p(n?: number): number {
  if (!n || n <= 0) return 0
  return Math.log1p(n)
}
