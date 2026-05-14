import { createHash } from 'crypto'

export function hashId(input: string, len = 12): string {
  return createHash('sha1').update(input).digest('hex').slice(0, len)
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-zA-Z]+);/g, (m, n) => NAMED_ENTITIES[n] ?? m)
}

// Strip HTML, decode entities, collapse whitespace, trim to maxLen.
export function cleanText(raw: string, maxLen = 600): string {
  return decodeEntities(raw.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen)
}

// Normalize a URL for dedup: drop hash, common tracking params, trailing slash.
export function canonicalUrl(raw: string): string {
  try {
    const u = new URL(raw)
    u.hash = ''
    const drop = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'ref_src']
    drop.forEach(p => u.searchParams.delete(p))
    let s = u.toString()
    if (s.endsWith('/')) s = s.slice(0, -1)
    return s
  } catch {
    return raw.trim()
  }
}

export function toIsoDate(input: string | number | undefined): string {
  if (input == null) return new Date().toISOString()
  if (typeof input === 'number') {
    const ms = input < 1e12 ? input * 1000 : input
    return new Date(ms).toISOString()
  }
  const d = new Date(input)
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

// Safe axios-like timeout for fetch wrappers.
export const DEFAULT_TIMEOUT_MS = 20_000
