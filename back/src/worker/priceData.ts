interface CoinGeckoSearchResult {
  coins?: Array<{ id: string; name: string; symbol: string; market_cap_rank?: number | null }>
}

interface CoinGeckoMarket {
  id: string
  symbol: string
  name: string
  current_price: number
  market_cap: number
  total_volume: number
  price_change_percentage_24h: number | null
  price_change_percentage_7d_in_currency?: number | null
  ath: number
  atl: number
  last_updated: string
}

const CG_BASE = process.env.COINGECKO_API ?? 'https://api.coingecko.com/api/v3'

export interface TokenPrice {
  coingecko_id: string
  symbol: string
  name: string
  price_usd: number
  market_cap_usd: number
  volume_24h_usd: number
  change_24h_pct: number | null
  change_7d_pct: number | null
  ath_usd: number
  atl_usd: number
  fetched_at: number
}

export async function lookupCoinGeckoId(query: string): Promise<string | null> {
  try {
    const res = await fetch(`${CG_BASE}/search?query=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': 'OGTimes-Agent/1.0' },
    })
    if (!res.ok) return null
    const data = (await res.json()) as CoinGeckoSearchResult
    const coins = data.coins ?? []
    const lower = query.toLowerCase().trim()
    const exact = coins.find(
      (c) => c.symbol.toLowerCase() === lower || c.name.toLowerCase() === lower || c.id.toLowerCase() === lower,
    )
    if (exact) return exact.id
    const ranked = coins.find((c) => c.market_cap_rank != null && c.market_cap_rank > 0)
    return ranked?.id ?? coins[0]?.id ?? null
  } catch {
    return null
  }
}

export async function fetchTokenPrice(coingeckoId: string): Promise<TokenPrice | null> {
  try {
    const url = `${CG_BASE}/coins/markets?vs_currency=usd&ids=${encodeURIComponent(coingeckoId)}&price_change_percentage=24h,7d`
    const res = await fetch(url, { headers: { 'User-Agent': 'OGTimes-Agent/1.0' } })
    if (!res.ok) return null
    const arr = (await res.json()) as CoinGeckoMarket[]
    const m = arr[0]
    if (!m) return null
    return {
      coingecko_id: m.id,
      symbol: m.symbol,
      name: m.name,
      price_usd: m.current_price,
      market_cap_usd: m.market_cap,
      volume_24h_usd: m.total_volume,
      change_24h_pct: m.price_change_percentage_24h ?? null,
      change_7d_pct: m.price_change_percentage_7d_in_currency ?? null,
      ath_usd: m.ath,
      atl_usd: m.atl,
      fetched_at: Date.now(),
    }
  } catch {
    return null
  }
}

export async function refreshTokenPrice(name: string, existingCoingeckoId?: string): Promise<TokenPrice | null> {
  const id = existingCoingeckoId ?? (await lookupCoinGeckoId(name))
  if (!id) return null
  return fetchTokenPrice(id)
}
