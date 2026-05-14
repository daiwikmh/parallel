// Entity extracted from a news article (used in later phases).
export type EntityType = 'person' | 'organization' | 'technology' | 'event' | 'place'

export interface Entity {
  name: string
  type: EntityType
  description?: string
}

// Source kinds the worker can pull from.
export type NewsSourceKind =
  | 'rss'
  | 'hackernews'
  | 'reddit'
  | 'github'
  | 'googleNews'
  | 'twitter'

export interface NewsSource {
  kind: NewsSourceKind
  name: string
}

// Unified record every provider produces.
export interface NewsItem {
  id: string
  title: string
  summary: string
  url: string
  publishedAt: string
  source: NewsSource
  score?: number
  signals?: NewsSignals
}

// Optional ranking signals a provider may attach (HN points, GH stars, reddit upvotes).
export interface NewsSignals {
  upvotes?: number
  comments?: number
  stars?: number
}

// Legacy alias kept so older code that imported RSSItem still compiles.
export type RSSItem = NewsItem

export interface EditorialResult {
  editorial: string
  illustrationPrompt: string
  entities: Entity[]
}

// KV record shapes used in later phases. Flat structures, KV is not relational.
export interface KVPieceMeta {
  id: string
  headline: string
  editorial: string
  illustrationPrompt: string
  imageRootHash: string
  entities: Entity[]
  timestamp: number
  sourceUrl: string
  sourceFeed: string
}

export interface KVEntityRecord {
  name: string
  type: EntityType
  description: string
  pieceIds: string[]
  firstSeen: number
  lastSeen: number
}

// Edges are NOT stored. They are computed on demand from co-occurrence
// within a requested time window. See graph.types.ts GraphEdge for the
// computed (read-time) shape that the API returns to the frontend.

export interface KVFeedIndex {
  pieceIds: string[]
  lastUpdated: number
}
