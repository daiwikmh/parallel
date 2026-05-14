import Parser from 'rss-parser'
import type { INewsProvider, NewsItem } from '../../lib/types'
import { canonicalUrl, cleanText, hashId, toIsoDate } from '../util'

export interface RssFeed {
  name: string
  url: string
}

export const DEFAULT_RSS_FEEDS: RssFeed[] = [
  { name: 'The Verge',       url: 'https://www.theverge.com/rss/index.xml' },
  { name: 'CoinTelegraph',   url: 'https://cointelegraph.com/rss' },
  { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/' },
  { name: 'arXiv AI',        url: 'https://arxiv.org/rss/cs.AI' },
]

export class RssProvider implements INewsProvider {
  readonly name = 'rss'
  readonly kind = 'rss' as const
  private parser: Parser
  private feeds: RssFeed[]

  constructor(feeds: RssFeed[] = DEFAULT_RSS_FEEDS) {
    this.feeds = feeds
    this.parser = new Parser({
      timeout: 20_000,
      headers: { 'User-Agent': 'OGTimes-Agent/1.0' },
    })
  }

  async fetch(): Promise<NewsItem[]> {
    const results = await Promise.allSettled(this.feeds.map(f => this.fetchOne(f)))
    const items: NewsItem[] = []
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') items.push(...r.value)
      else console.warn(`[rss] ${this.feeds[i].name} failed: ${(r.reason as Error)?.message}`)
    })
    return items
  }

  private async fetchOne(feed: RssFeed): Promise<NewsItem[]> {
    const parsed = await this.parser.parseURL(feed.url)
    const out: NewsItem[] = []
    for (const item of parsed.items ?? []) {
      const link = item.link ?? item.guid ?? ''
      if (!link) continue
      const title = item.title?.trim() ?? ''
      const rawSummary = item.contentSnippet ?? item.summary ?? item.content ?? ''
      const summary = cleanText(rawSummary)
      if (!title || summary.length < 20) continue
      const url = canonicalUrl(link)
      out.push({
        id: hashId(url),
        title,
        summary,
        url,
        publishedAt: toIsoDate(item.pubDate),
        source: { kind: 'rss', name: feed.name },
      })
    }
    return out
  }
}
