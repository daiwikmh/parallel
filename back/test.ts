import { fetchAllSources } from './src/worker/fetch'

async function main() {
  console.log('Running OG Times news aggregator (all providers)...\n')
  const t0 = Date.now()
  const { ranked, providerResults } = await fetchAllSources()
  const ms = Date.now() - t0

  console.log('Provider status:')
  for (const r of providerResults) {
    const tag = r.ok ? 'ok' : 'fail'
    console.log(`  [${tag}] ${r.provider.padEnd(12)} ${r.items.length} items${r.error ? ' — ' + r.error : ''}`)
  }

  console.log(`\nTotal unique items: ${ranked.length} (in ${ms}ms)`)
  console.log('\nTop 10 ranked:\n')
  ranked.slice(0, 10).forEach((it, i) => {
    const s = it.signals
    const sigStr = s
      ? ` [${[
          s.upvotes ? `up:${s.upvotes}` : '',
          s.comments ? `c:${s.comments}` : '',
          s.stars ? `s:${s.stars}` : '',
        ].filter(Boolean).join(' ')}]`
      : ''
    console.log(`#${i + 1} score=${(it.score ?? 0).toFixed(2)} ${it.source.name}${sigStr}`)
    console.log(`    ${it.title}`)
    console.log(`    ${it.summary.slice(0, 140).replace(/\n/g, ' ')}${it.summary.length > 140 ? '...' : ''}`)
    console.log(`    ${it.url}`)
    console.log()
  })

  const best = ranked[0]
  if (best) {
    console.log('Agent would publish:')
    console.log(`  Source:  ${best.source.name}`)
    console.log(`  Title:   ${best.title}`)
    console.log(`  Score:   ${(best.score ?? 0).toFixed(2)}`)
    console.log(`  URL:     ${best.url}`)
  } else {
    console.log('No items fetched. Check provider statuses above.')
  }
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
