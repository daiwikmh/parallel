import type { NewsItem, NewsSourceKind } from './news.types'

// OAuth provider config (used by services/, unrelated to news worker).
export interface ProviderConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  scope?: string
  timeoutMs?: number
}

export interface IUser {
  id: string
  providerId: string
  email: string
  name: string
  avatarUrl?: string
  rawProfile?: Record<string, unknown>
}

export interface IOAuthTokens {
  accessToken: string
  refreshToken?: string
  scope?: string
  expiresAt: Date
}

export interface IOAuthProvider {
  providerName: string
  getAuthUrl(state: string): string
  exchangeCodeForToken(code: string): Promise<IOAuthTokens>
  getUserProfile(accessToken: string): Promise<IUser>
}

// News worker provider interface.
export interface INewsProvider {
  readonly name: string
  readonly kind: NewsSourceKind
  fetch(): Promise<NewsItem[]>
}

export interface ProviderResult {
  provider: string
  kind: NewsSourceKind
  ok: boolean
  items: NewsItem[]
  error?: string
}
