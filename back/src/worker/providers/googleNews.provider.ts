import Parser from 'rss-parser'
import type { INewsProvider, NewsItem } from '../../lib/types'
import { canonicalUrl, cleanText, hashId, toIsoDate } from '../util'

export interface GoogleNewsOptions {
  topics?: string[]
  lang?: string
  region?: string
  perTopic?: number
}

export class GoogleNewsProvider implements INewsProvider {
  readonly name = 'googleNews'
  readonly kind = 'googleNews' as const
  private parser: Parser
  private topics: string[]
  private lang: string
  private region: string
  private perTopic: number

  constructor(opts: GoogleNewsOptions = {}) {
    this.topics = opts.topics ?? ['AI', 'crypto', 'blockchain', 'startup funding']
    this.lang = opts.lang ?? 'en-US'
    this.region = opts.region ?? 'US'
    this.perTopic = opts.perTopic ?? 10
    this.parser = new Parser({
      timeout: 20_000,
      headers: { 'User-Agent': 'OGTimes-Agent/1.0' },
    })
  }

  async fetch(): Promise<NewsItem[]> {
    const results = await Promise.allSettled(this.topics.map(t => this.fetchTopic(t)))
    const out: NewsItem[] = []
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') out.push(...r.value)
      else console.warn(`[googleNews] "${this.topics[i]}" failed: ${(r.reason as Error)?.message}`)
    })
    return out
  }

  private async fetchTopic(topic: string): Promise<NewsItem[]> {
    const q = encodeURIComponent(topic)
    const url = `https://news.google.com/rss/search?q=${q}&hl=${this.lang}&gl=${this.region}&ceid=${this.region}:${this.lang.split('-')[0]}`
    const parsed = await this.parser.parseURL(url)
    const out: NewsItem[] = []
    for (const item of (parsed.items ?? []).slice(0, this.perTopic)) {
      const link = item.link ?? ''
      if (!link) continue
      const title = item.title?.trim() ?? ''
      const summary = cleanText(item.contentSnippet ?? item.content ?? '', 600)
      if (!title || summary.length < 10) continue
      const canon = canonicalUrl(link)
      out.push({
        id: hashId(canon),
        title,
        summary,
        url: canon,
        publishedAt: toIsoDate(item.pubDate),
        source: { kind: 'googleNews', name: `Google News: ${topic}` },
      })
    }
    return out
  }
}
