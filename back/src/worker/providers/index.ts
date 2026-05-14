import type { INewsProvider } from '../../lib/types'
import { RssProvider } from './rss.provider'
import { HackerNewsProvider } from './hackernews.provider'
import { RedditProvider } from './reddit.provider'
import { GitHubProvider } from './github.provider'
import { GoogleNewsProvider } from './googleNews.provider'
import { TwitterProvider } from './twitter.provider'

export {
  RssProvider,
  HackerNewsProvider,
  RedditProvider,
  GitHubProvider,
  GoogleNewsProvider,
  TwitterProvider,
}

// Twitter intentionally excluded: paid API only, revisit later.
export function defaultProviders(): INewsProvider[] {
  return [
    new RssProvider(),
    new HackerNewsProvider(),
    new RedditProvider(),
    new GitHubProvider(),
    new GoogleNewsProvider(),
  ]
}
