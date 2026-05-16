# OG Times

**Private intelligence platform built on 0G Compute.** You commission a topic. An agent ingests news from sources you choose, extracts a typed knowledge graph + editorial brief, and pings your Telegram when something material changes — with a per-call audit trail signed by an on-chain 0G inference provider.

Built for the 0G hackathon.

---

## What it does

1. **Commission a topic.** Type any token, protocol, company, person, or jurisdiction. The agent classifies the entity (via 0G inference) and creates a persistent watcher.
2. **Bring your own sources.** Add RSS feeds and YouTube channels per commission. The agent prefers your curated sources over the global news cache.
3. **Click RUN NOW.** The agent picks an article, writes a 2-3 sentence editorial take, extracts typed entities + edges into a per-tenant knowledge graph, and persists everything with provenance.
4. **Set alerts.** Fire when a specific entity is mentioned, when an edge type appears (e.g. `exploited`, `regulates`), when a keyword shows up in evidence, or when sentiment toward an entity drops below a threshold.
5. **Get pinged on Telegram** when an alert fires (also delivers to webhook + in-app log).
6. **Open the audit log** at `/agent` to see every action you took, every inference call (with 0G provider address + request_id + cost in wei), every brief generated, every alert fired.

The "verifiable" claim is concrete: every fact in your graph links to an article, every brief links to an inference `request_id`, every inference call carries the on-chain provider address that served it, billed in wei to your account on the 0G inference router.

---

## 0G layers used

| Layer | Status | What we do with it |
|---|---|---|
| 0G Compute (inference) | Live | Every classify / editorial / extract / 7-day-summary call goes through the 0G testnet router. We capture the response's `x_0g_trace` (provider address, billing in wei, request_id) into our `traces` table on every call. |
| 0G Chain | Wired, gated by `OG_CHAIN_ENABLED` | Payment contract deployed on Galileo testnet. Backend listens for `Paid` events via viem and grants commission access to the paying wallet. Free tier: 2 runs per wallet, then paywall. |
| 0G Storage | Live, gated by `OG_STORAGE_ENABLED` | Brief snapshots uploaded via `@0gfoundation/0g-storage-ts-sdk` (Indexer + MemData). On success returns `0g:<rootHash>` and persists to `briefs.storage_hash`; falls back to `local:<sha256>` when flag off or wallet unfunded. |

Per-tenant private graph + verifiable LLM trail is the moat. Storage and chain commits are deliberately minimal per cycle to keep cost bounded.

---

## System

```
                       +----------------------------------------+
                       |  USER  (browser  +  MetaMask wallet)   |
                       +-------------------+--------------------+
                                           |
                       +-------------------v--------------------+
                       |  Next.js 16  frontend   :3000          |
                       |  /dashboard    force-directed graph    |
                       |  /agent        audit log + spend       |
                       |  brief panel   sources    alerts       |
                       |  upload CSV    7d summary  wallet UI   |
                       +-------------------+--------------------+
                                           |  HTTP
                                           |  X-Wallet-Address
                       +-------------------v--------------------+
                       |  Bun + Express backend   :4000         |
                       |                                        |
                       |   commissions   classify  -->  graph   |
                       |   sources (RSS, YouTube, HN, Reddit)   |
                       |   uploads.router (CSV  -->  extract)   |
                       |   alerts.engine  (4 rule kinds)        |
                       |   payment.access (free tier + paywall) |
                       |   agent.run      (RUN NOW only)        |
                       |                                        |
                       |   +--------------------------------+   |
                       |   |  SQLite  bun:sqlite  WAL       |   |
                       |   |  entities   edges   articles   |   |
                       |   |  briefs     traces  uploads    |   |
                       |   |  alert_rules alert_events      |   |
                       |   |  commissions   sources         |   |
                       |   |  wallet_access  delivery_chan  |   |
                       |   +--------------------------------+   |
                       +---+--------+---------+----------+------+
                           |        |         |          |
                           v        v         v          v
                  +--------+--+ +---+----+ +--+-----+ +--+------+
                  | 0G        | | 0G     | | 0G     | | Telegram|
                  | Compute   | | Storage| | Chain  | | Bot     |
                  | qwen 7B   | | Flow   | | Payment| | (long-  |
                  | router    | | + Idx  | | ctr    | |  poll)  |
                  |           | |        | |        | |         |
                  | trace per | | JSON   | | pay()  | | alert   |
                  | call:     | | snap   | | 0.01 OG| | push to |
                  | provider, | | upload | | Paid   | | chat_id |
                  | wei cost, | | -> 0g: | | event  | | on rule |
                  | req_id    | | <root> | | listen | | fire    |
                  +-----------+ +--------+ +--------+ +---------+
```

### Features at a glance

```
  commission flow  :  type a topic -> classify -> persistent watcher
  manual trigger   :  RUN NOW button only, no autonomous loops
  typed graph      :  7 entity types, 16 edge types, evidence + provenance
  briefs           :  per-run editorial, 7-day LLM summary, alert digest
  sources          :  BYO RSS, YouTube channels, global news cache
  alerts           :  entity_mentioned, edge_type_added,
                      keyword_in_evidence, sentiment_drop
  delivery         :  in-app log, webhook URL, Telegram chat_id
  audit log        :  every event with 0G trace_id, provider, wei cost
  upload CSV       :  20 rows, SHA-256 + 0G Storage hash, same extractor
  paywall          :  2 free runs per wallet, then pay() on 0G chain
```

### Deployed contracts (0G Galileo testnet, chain id 16601)

```
  Payment contract :  0x2a8142Db4C3b90333339A6E25b225e808098BDB0
  Flow contract    :  0x22e03a6a89b950f1c82ec5e74f8eca321a105296  (storage)
  EVM RPC          :  https://evmrpc-testnet.0g.ai
  Storage indexer  :  https://indexer-storage-testnet-turbo.0g.ai
  Inference router :  https://router-api-testnet.integratenetwork.work/v1
  Inference model  :  qwen/qwen-2.5-7b-instruct
  Telegram bot     :  @ogtimes_bot
```

---

## Demo path (90 seconds)

1. Land on `/dashboard`. See 4 active commissions (Bitcoin, Ethereum, Solana, BlackRock), each with prices and existing graph nodes.
2. Click "Ethereum" → see force-directed graph + brief panel + sources panel + alerts panel.
3. Click `7d brief` → LLM-generated paragraph appears summarizing the last week's activity.
4. Click `+ new` in alerts → create rule "edge_type_added" with edge types `exploited, regulates`.
5. Click RUN NOW. Watch the graph add nodes, the brief appear, the alert fire (in-app log) and (if `TG_BOT_TOKEN` set) ping your phone.
6. Drop a CSV into the **Upload Dataset** panel (sample files in `data/`). Watch the progress bar fill, then see new nodes absorbed into the same commission graph in real time. The content hash is committed — your data, your record.
7. Click Audit Log in sidebar → see every event from this session: commission selection, RUN NOW, inference calls (with 0G request IDs + provider addresses), brief generation, alert firing, dataset uploads. Total OG spent: visible in the stats tile.

---

## Upload your data

The Upload Dataset panel on each commission accepts CSV files (≤1MB, up to 20 rows processed per upload). Headers in the first row; everything else is content.

- Each row is passed to the same typed-entity extractor that handles news articles.
- Entities and edges land in the commission graph with `evidence` set to the row text and `properties.upload_id` referencing the file.
- The file content is hashed (SHA-256) before any inference call — that hash is the `storage_uri` you see in the UI. With `OG_STORAGE_ENABLED=true` and a funded `OG_STORAGE_PRIVATE_KEY`, the JSON snapshot is uploaded to 0G Storage and the UI shows `0g:<rootHash>` instead of `local:<sha>`.
- Sample CSVs live in `data/sample-acquisitions.csv` and `data/sample-token-launches.csv`. Try them on BlackRock and Solana respectively.

What this is NOT (yet):
- File types beyond CSV. No JSON, no Excel, no PDF.
- Per-row JSON Storage upload, not per-file. (CSV uploads anchor file content hash but each extracted row currently isn't its own snapshot.)
- Per-column type mapping wizard. The LLM reads the headers and infers.

---

## What's intentionally manual

No background polling. No autonomous loops. Every agent action is triggered by an explicit user click. This is deliberate — keeps inference costs bounded and the audit trail meaningful (every entry corresponds to a real user intent).

---

## Known gaps (honest)

- 0G Storage uploads are per-brief, not batched. Each RUN NOW triggers one upload tx per article processed. At any volume, batch a run's snapshots into one merkle-rooted upload to cut chain fees.
- Payment gate is built and tested against a stub. Real chain event listener wires when contract deployment + ABI are pasted.
- Email digest delivery skipped — Telegram + Slack-via-webhook only.
- Single-user mode. `owner_id = wallet address (or 'anon')` everywhere; no multi-user workspace.
- Entity disambiguation handles top-30 crypto tickers reliably; outside that domain, occasional duplicates.

---

## License

MIT.
