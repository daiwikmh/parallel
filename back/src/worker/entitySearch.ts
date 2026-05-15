import { GoogleNewsProvider } from './providers/googleNews.provider'
import type { NewsItem } from '../lib/types'

export async function searchNewsForEntity(
  name: string,
  aliases: string[] = [],
  perQuery = 8,
): Promise<NewsItem[]> {
  const queries = Array.from(new Set([name, ...aliases].filter((t) => t.length >= 2))).slice(0, 3)
  if (!queries.length) return []
  const provider = new GoogleNewsProvider({ topics: queries, perTopic: perQuery })
  return provider.fetch()
}
