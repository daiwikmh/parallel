import axios from 'axios'
import type { INewsProvider, NewsItem } from '../../lib/types'
import { canonicalUrl, cleanText, hashId, toIsoDate, DEFAULT_TIMEOUT_MS } from '../util'

interface GhRepo {
  id: number
  full_name: string
  html_url: string
  description: string | null
  created_at: string
  pushed_at: string
  stargazers_count: number
  forks_count: number
  language: string | null
  topics?: string[]
}

interface GhSearchResponse {
  items: GhRepo[]
}

export interface GitHubOptions {
  windowDays?: number
  minStars?: number
  limit?: number
  languages?: string[]
  token?: string
}

export class GitHubProvider implements INewsProvider {
  readonly name = 'github'
  readonly kind = 'github' as const
  private windowDays: number
  private minStars: number
  private limit: number
  private languages?: string[]
  private token?: string

  constructor(opts: GitHubOptions = {}) {
    this.windowDays = opts.windowDays ?? 7
    this.minStars = opts.minStars ?? 50
    this.limit = opts.limit ?? 25
    this.languages = opts.languages
    this.token = opts.token ?? process.env.GITHUB_TOKEN
  }

  async fetch(): Promise<NewsItem[]> {
    const since = new Date(Date.now() - this.windowDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)

    const langClause = this.languages?.length
      ? ' ' + this.languages.map(l => `language:${l}`).join(' ')
      : ''
    const q = `created:>${since} stars:>${this.minStars}${langClause}`

    const headers: Record<string, string> = {
      'User-Agent': 'OGTimes-Agent/1.0',
      Accept: 'application/vnd.github+json',
    }
    if (this.token) headers.Authorization = `Bearer ${this.token}`

    const res = await axios.get<GhSearchResponse>('https://api.github.com/search/repositories', {
      params: { q, sort: 'stars', order: 'desc', per_page: this.limit },
      headers,
      timeout: DEFAULT_TIMEOUT_MS,
    })

    const out: NewsItem[] = []
    for (const r of res.data?.items ?? []) {
      const url = canonicalUrl(r.html_url)
      const title = r.full_name
      const desc = r.description ?? 'No description provided.'
      const tags = r.topics?.length ? ` Topics: ${r.topics.join(', ')}.` : ''
      const lang = r.language ? ` Language: ${r.language}.` : ''
      const summary = cleanText(`${desc}${lang}${tags}`, 600)
      out.push({
        id: hashId(url),
        title,
        summary,
        url,
        publishedAt: toIsoDate(r.pushed_at || r.created_at),
        source: { kind: 'github', name: 'GitHub Trending' },
        signals: { stars: r.stargazers_count },
      })
    }
    return out
  }
}
