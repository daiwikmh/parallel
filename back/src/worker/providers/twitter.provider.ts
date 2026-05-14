import type { INewsProvider, NewsItem } from '../../lib/types'

// Twitter/X removed all free read access in 2023.
// Basic tier is paid. This provider stays stubbed until a key or scraping proxy is wired.
// Set TWITTER_BEARER_TOKEN to enable; for now fetch() returns [] and warns.

export interface TwitterOptions {
  bearerToken?: string
  queries?: string[]
  perQuery?: number
}

export class TwitterProvider implements INewsProvider {
  readonly name = 'twitter'
  readonly kind = 'twitter' as const
  private bearerToken?: string
  private warned = false

  constructor(opts: TwitterOptions = {}) {
    this.bearerToken = opts.bearerToken ?? process.env.TWITTER_BEARER_TOKEN
  }

  async fetch(): Promise<NewsItem[]> {
    if (!this.bearerToken) {
      if (!this.warned) {
        console.warn('[twitter] disabled: no TWITTER_BEARER_TOKEN set. Free tier was removed in 2023.')
        this.warned = true
      }
      return []
    }
    // TODO: implement real call once a paid bearer is provided.
    return []
  }
}
