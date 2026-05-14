import { chatJson, type ChatMessage, type ChatResult } from '../og/compute'
import { ENTITY_KINDS, type EntityKind } from '../lib/types/graph-db.types'

export interface ClassifyResult {
  type: EntityKind
  canonical_id: string
  canonical_name: string
  aliases: string[]
  confidence: number
}

export interface ClassifyOutput {
  result: ClassifyResult
  source: ChatResult
}

const SYSTEM = `You classify a free-text query into an entity for a knowledge graph about crypto, finance, tech, and regulation.

Entity types (use EXACTLY one of these):
  - token        — cryptocurrencies, stablecoins (Bitcoin, USDC, SOL)
  - protocol     — DeFi/web3 protocols (Uniswap, Lido, Aave)
  - company      — businesses (Coinbase, BlackRock, Circle)
  - person       — individuals (Vitalik Buterin, Sam Altman)
  - jurisdiction — regulators, governments, regulatory frameworks (US SEC, EU MiCA)
  - event        — discrete dated occurrences (Ethereum Merge, DAO Hack)
  - topic        — broad themes (L2 fee compression, restaking)

Output strictly this JSON, no prose, no code fences:
{
  "type": "<entity-type>",
  "canonical_id": "<type>:<lowercase-slug>",
  "canonical_name": "<official name>",
  "aliases": ["<known aliases or alternate spellings>"],
  "confidence": 0.0-1.0
}

If you cannot classify confidently, choose "topic" and set confidence below 0.5.
canonical_id format: "<type>:<slug>" e.g. "token:btc", "person:vitalik-buterin", "jurisdiction:eu-mica".`

export async function classifyQuery(query: string): Promise<ClassifyOutput> {
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: `Query: ${query.trim()}\n\nReturn classification JSON now.` },
  ]
  const { data, result } = await chatJson<Partial<ClassifyResult>>(messages, {
    temperature: 0.1,
    maxTokens: 200,
  })

  const type = typeof data.type === 'string' && ENTITY_KINDS.includes(data.type as EntityKind)
    ? (data.type as EntityKind)
    : 'topic'
  const canonical_id =
    typeof data.canonical_id === 'string' && data.canonical_id.includes(':')
      ? data.canonical_id.toLowerCase().trim()
      : `${type}:${slug(query)}`
  const canonical_name = typeof data.canonical_name === 'string' && data.canonical_name.trim().length > 0
    ? data.canonical_name.trim()
    : query.trim()
  const aliases = Array.isArray(data.aliases)
    ? data.aliases.filter((a): a is string => typeof a === 'string' && a.trim().length > 0).map((a) => a.trim())
    : []
  const confidence = typeof data.confidence === 'number' && data.confidence >= 0 && data.confidence <= 1
    ? data.confidence
    : 0.5

  return {
    result: { type, canonical_id, canonical_name, aliases, confidence },
    source: result,
  }
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'unknown'
}
