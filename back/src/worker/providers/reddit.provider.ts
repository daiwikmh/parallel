import axios from 'axios'
import type { INewsProvider, NewsItem } from '../../lib/types'
import { canonicalUrl, cleanText, hashId, toIsoDate, DEFAULT_TIMEOUT_MS } from '../util'

interface RedditChild {
  data: {
    id: string
    title: string
    selftext?: string
    url?: string
    permalink: string
    created_utc: number
    ups: number
    num_comments: number
    is_self: boolean
    subreddit: string
    over_18?: boolean
    stickied?: boolean
  }
}

interface RedditListing {
  data: { children: RedditChild[] }
}

export interface RedditOptions {
  subreddits?: string[]
  timeRange?: 'hour' | 'day' | 'week'
  limit?: number
  minUpvotes?: number
}

export class RedditProvider implements INewsProvider {
  readonly name = 'reddit'
  readonly kind = 'reddit' as const
  private subs: string[]
  private timeRange: string
  private limit: number
  private minUpvotes: number

  constructor(opts: RedditOptions = {}) {
    this.subs = opts.subreddits ?? ['technology', 'MachineLearning', 'CryptoCurrency', 'programming']
    this.timeRange = opts.timeRange ?? 'day'
    this.limit = opts.limit ?? 15
    this.minUpvotes = opts.minUpvotes ?? 100
  }

  async fetch(): Promise<NewsItem[]> {
    const results = await Promise.allSettled(this.subs.map(s => this.fetchSub(s)))
    const out: NewsItem[] = []
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') out.push(...r.value)
      else console.warn(`[reddit] r/${this.subs[i]} failed: ${(r.reason as Error)?.message}`)
    })
    return out
  }

  private async fetchSub(sub: string): Promise<NewsItem[]> {
    const url = `https://www.reddit.com/r/${sub}/top.json?t=${this.timeRange}&limit=${this.limit}`
    const res = await axios.get<RedditListing>(url, {
      timeout: DEFAULT_TIMEOUT_MS,
      headers: { 'User-Agent': 'OGTimes-Agent/1.0 (news aggregator)' },
    })
    const children = res.data?.data?.children ?? []
    const out: NewsItem[] = []
    for (const c of children) {
      const d = c.data
      if (d.over_18 || d.stickied) continue
      if (d.ups < this.minUpvotes) continue
      const link = d.is_self ? `https://www.reddit.com${d.permalink}` : (d.url ?? `https://www.reddit.com${d.permalink}`)
      const canon = canonicalUrl(link)
      const summary = cleanText(d.selftext || d.title, 600)
      out.push({
        id: hashId(canon),
        title: d.title.trim(),
        summary,
        url: canon,
        publishedAt: toIsoDate(d.created_utc),
        source: { kind: 'reddit', name: `r/${d.subreddit}` },
        signals: { upvotes: d.ups, comments: d.num_comments },
      })
    }
    return out
  }
}
