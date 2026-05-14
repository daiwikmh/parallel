import axios from 'axios'
import type { INewsProvider, NewsItem } from '../../lib/types'
import { canonicalUrl, cleanText, hashId, toIsoDate, DEFAULT_TIMEOUT_MS } from '../util'

const HN_API = 'https://hacker-news.firebaseio.com/v0'

interface HnItem {
  id: number
  title?: string
  url?: string
  text?: string
  score?: number
  descendants?: number
  time?: number
  type?: string
  by?: string
}

export interface HackerNewsOptions {
  limit?: number
  minScore?: number
}

export class HackerNewsProvider implements INewsProvider {
  readonly name = 'hackernews'
  readonly kind = 'hackernews' as const
  private limit: number
  private minScore: number

  constructor(opts: HackerNewsOptions = {}) {
    this.limit = opts.limit ?? 30
    this.minScore = opts.minScore ?? 20
  }

  async fetch(): Promise<NewsItem[]> {
    const idsRes = await axios.get<number[]>(`${HN_API}/topstories.json`, { timeout: DEFAULT_TIMEOUT_MS })
    const ids = (idsRes.data ?? []).slice(0, this.limit)
    const results = await Promise.allSettled(
      ids.map(id => axios.get<HnItem>(`${HN_API}/item/${id}.json`, { timeout: DEFAULT_TIMEOUT_MS })),
    )

    const out: NewsItem[] = []
    for (const r of results) {
      if (r.status !== 'fulfilled') continue
      const it = r.value.data
      if (!it || it.type !== 'story' || !it.title) continue
      if ((it.score ?? 0) < this.minScore) continue

      const link = it.url ?? `https://news.ycombinator.com/item?id=${it.id}`
      const url = canonicalUrl(link)
      const summary = cleanText(it.text ?? it.title, 600)
      out.push({
        id: hashId(url),
        title: it.title.trim(),
        summary,
        url,
        publishedAt: toIsoDate(it.time),
        source: { kind: 'hackernews', name: 'Hacker News' },
        signals: { upvotes: it.score, comments: it.descendants },
      })
    }
    return out
  }
}
