import type { NewsItem } from '../lib/types'
import { canonicalUrl } from './util'

// Dedup by canonical url (preferred) then by normalized title.
// Keeps the highest-scored variant when duplicates collide.
export function dedupe(items: NewsItem[]): NewsItem[] {
  const byKey = new Map<string, NewsItem>()
  for (const it of items) {
    const urlKey = canonicalUrl(it.url)
    const titleKey = normalizeTitle(it.title)
    const key = urlKey || titleKey
    const existing = byKey.get(key)
    if (!existing || (it.score ?? 0) > (existing.score ?? 0)) {
      byKey.set(key, it)
    }
  }
  return [...byKey.values()]
}

function normalizeTitle(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}
