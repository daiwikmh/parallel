import '../lib/env'
import { db } from './client'
import { createCommission, upsertEntity, listCommissions, createSource, type SourceKind } from './repo'
import { refreshTokenPrice } from '../worker/priceData'

interface DemoCommission {
  query_text: string
  entity_id: string
  entity_type: 'token' | 'protocol' | 'company'
  entity_name: string
  aliases: string[]
  sources?: Array<{ kind: SourceKind; url: string; label: string }>
}

const DEMOS: DemoCommission[] = [
  {
    query_text: 'Bitcoin',
    entity_id: 'token:bitcoin',
    entity_type: 'token',
    entity_name: 'Bitcoin',
    aliases: ['BTC'],
  },
  {
    query_text: 'Ethereum',
    entity_id: 'protocol:ethereum',
    entity_type: 'protocol',
    entity_name: 'Ethereum',
    aliases: ['ETH', 'Ether'],
    sources: [
      { kind: 'rss', url: 'https://blog.ethereum.org/feed.xml', label: 'Ethereum Foundation Blog' },
    ],
  },
  {
    query_text: 'Solana',
    entity_id: 'token:solana',
    entity_type: 'token',
    entity_name: 'Solana',
    aliases: ['SOL'],
  },
  {
    query_text: 'BlackRock',
    entity_id: 'company:blackrock',
    entity_type: 'company',
    entity_name: 'BlackRock',
    aliases: [],
  },
]

async function main(): Promise<void> {
  const existing = listCommissions()
  const existingTexts = new Set(existing.map((c) => c.query_text.toLowerCase()))
  let created = 0
  let skipped = 0
  for (const d of DEMOS) {
    if (existingTexts.has(d.query_text.toLowerCase())) {
      skipped++
      console.log(`[skip] ${d.query_text} already exists`)
      continue
    }
    let attributes: Record<string, unknown> | undefined
    if (d.entity_type === 'token' || d.entity_type === 'protocol') {
      try {
        const price = await refreshTokenPrice(d.entity_name)
        if (price) attributes = { price }
      } catch {
        /* skip price */
      }
    }
    upsertEntity({
      canonical_id: d.entity_id,
      type: d.entity_type,
      name: d.entity_name,
      aliases: d.aliases,
      attributes,
    })
    const c = createCommission({
      query_text: d.query_text,
      entity_id: d.entity_id,
      entity_type: d.entity_type,
      thesis: null,
    })
    if (d.sources) {
      for (const s of d.sources) {
        createSource({ commission_id: c.id, kind: s.kind, url: s.url, label: s.label })
      }
    }
    console.log(`[seed] ${d.query_text} → ${c.id}`)
    created++
  }
  console.log(`\n${created} created, ${skipped} skipped`)
  console.log('\nNext: start backend (bun run dev) and click RUN NOW on each commission to populate graphs.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
