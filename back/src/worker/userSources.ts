import { XMLParser } from 'fast-xml-parser'
import type { NewsItem, NewsSourceKind } from '../lib/types'
import {
  listActiveSources,
  recordSourceFetch,
  type SourceRow,
  type SourceKind,
} from '../db/repo'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: '#text',
})

export interface UserSourceFetchResult {
  source: SourceRow
  items: NewsItem[]
  error: string | null
}

export async function fetchUserSources(commissionId: string): Promise<UserSourceFetchResult[]> {
  const sources = listActiveSources(commissionId)
  const results: UserSourceFetchResult[] = []
  for (const s of sources) {
    try {
      const items = await fetchOne(s)
      recordSourceFetch(s.id, items.length, null)
      results.push({ source: s, items, error: null })
    } catch (e) {
      const msg = (e as Error).message.slice(0, 200)
      recordSourceFetch(s.id, 0, msg)
      results.push({ source: s, items: [], error: msg })
    }
  }
  return results
}

async function fetchOne(s: SourceRow): Promise<NewsItem[]> {
  const url = normalizeUrl(s.kind as SourceKind, s.url)
  const res = await fetch(url, {
    headers: { 'user-agent': 'OG-Times/0.1 (+https://og-times.example)' },
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`fetch ${url} → ${res.status}`)
  const xml = await res.text()
  const parsed = parser.parse(xml) as Record<string, unknown>
  const items = parsed.rss
    ? extractRss(parsed.rss as Record<string, unknown>, s)
    : parsed.feed
      ? extractAtom(parsed.feed as Record<string, unknown>, s)
      : []
  return items.slice(0, 30)
}

function normalizeUrl(kind: SourceKind, url: string): string {
  if (kind === 'youtube') {
    const channelId = parseYouTubeChannelId(url)
    if (channelId) return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
  }
  return url
}

function parseYouTubeChannelId(input: string): string | null {
  const trimmed = input.trim()
  if (/^UC[A-Za-z0-9_-]{20,24}$/.test(trimmed)) return trimmed
  const m = trimmed.match(/channel\/(UC[A-Za-z0-9_-]{20,24})/)
  return m ? m[1] : null
}

interface RssItem {
  title?: string | { '#text'?: string }
  description?: string | { '#text'?: string }
  link?: string | { '#text'?: string }
  pubDate?: string
  'dc:date'?: string
  guid?: string | { '#text'?: string }
}

function extractRss(rss: Record<string, unknown>, s: SourceRow): NewsItem[] {
  const channel = rss.channel as Record<string, unknown> | undefined
  if (!channel) return []
  const sourceName = textOf(channel.title) || s.label || s.url
  const rawItems = channel.item
  const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : []
  return items.map((it) => itemFromRss(it as RssItem, s, sourceName))
}

interface AtomEntry {
  title?: string | { '#text'?: string }
  summary?: string | { '#text'?: string }
  content?: string | { '#text'?: string }
  link?: { href?: string } | Array<{ href?: string }>
  published?: string
  updated?: string
  id?: string
}

function extractAtom(feed: Record<string, unknown>, s: SourceRow): NewsItem[] {
  const sourceName = textOf(feed.title) || s.label || s.url
  const rawEntries = feed.entry
  const entries = Array.isArray(rawEntries) ? rawEntries : rawEntries ? [rawEntries] : []
  return entries.map((e) => itemFromAtom(e as AtomEntry, s, sourceName))
}

function itemFromRss(it: RssItem, s: SourceRow, sourceName: string): NewsItem {
  const title = textOf(it.title) || '(untitled)'
  const link = textOf(it.link) || ''
  const summary = stripHtml(textOf(it.description)).slice(0, 600)
  const published = it.pubDate || it['dc:date'] || ''
  const guid = textOf(it.guid) || link || `${s.id}-${title.slice(0, 32)}`
  return {
    id: hashId(guid),
    title,
    summary,
    url: link,
    publishedAt: parseDateIsoSafe(published),
    source: { name: `${sourceName} (you)`, kind: kindFor(s.kind) },
  }
}

function itemFromAtom(e: AtomEntry, s: SourceRow, sourceName: string): NewsItem {
  const title = textOf(e.title) || '(untitled)'
  const linkRaw = Array.isArray(e.link) ? e.link[0]?.href : e.link?.href
  const link = linkRaw ?? ''
  const summary = stripHtml(textOf(e.summary) || textOf(e.content)).slice(0, 600)
  const published = e.published || e.updated || ''
  const id = e.id || link || `${s.id}-${title.slice(0, 32)}`
  return {
    id: hashId(id),
    title,
    summary,
    url: link,
    publishedAt: parseDateIsoSafe(published),
    source: { name: `${sourceName} (you)`, kind: kindFor(s.kind) },
  }
}

function kindFor(k: SourceKind): NewsSourceKind {
  return k === 'youtube' ? 'rss' : 'rss'
}

function textOf(v: unknown): string {
  if (v === undefined || v === null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'object' && v !== null && '#text' in v) return String((v as { '#text': unknown })['#text'] ?? '')
  return String(v)
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function parseDateIsoSafe(s: string): string {
  const t = Date.parse(s)
  if (Number.isFinite(t)) return new Date(t).toISOString()
  return new Date().toISOString()
}

function hashId(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return Math.abs(h).toString(16).padStart(8, '0').slice(0, 12)
}
