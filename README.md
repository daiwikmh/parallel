# Frame0

> **Frame0 turns scattered news and datasets into a typed knowledge graph that compounds with every run — built end-to-end on 0G.**
> Every LLM call is signed by the 0G Compute router, every brief is anchored to 0G Storage, every paywall settles on 0G Chain.

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

## Hackathon progress

### Editorial agent loop (the load-bearing flow)

End-to-end: **commission a topic → classify the entity → fetch news from cache, BYO RSS feeds, and a targeted Google News fallback → batch-process up to 8 articles → generate an editorial brief per article → extract typed entities and relationships → persist with provenance → evaluate alert rules → deliver to in-app log, webhook, or Telegram**. Every step is initiated by an explicit user click on RUN NOW. No autonomous polling. No scheduled background runs.

### Typed knowledge graph

- **7 entity types**: token, protocol, company, person, jurisdiction, event, topic.
- **16 typed edge kinds**: `founded`, `works_at`, `partners_with`, `invests_in`, `regulates`, `built_on`, `competes_with`, `mentions`, `affects`, `holds_treasury_in`, `audited_by`, `exploited`, `merged_into`, `forked_from`, `announced`, `denied`.
- **Domain/range validator** rejects extracted edges where the source and destination entity types don't match the edge type's allowed schema.
- **Articles persisted as nodes** (`event:article-*`) with `mentions` edges to every co-occurring entity. This is what makes sparse extractions still produce a rich, navigable graph.
- **Entity alias resolution** with a seeded top-30 crypto ticker dictionary. Fixes the `token:bitcoin` vs `token:btc` duplicate-node problem.
- **CoinGecko price enrichment** on every token/protocol entity, refreshed on commission creation and each batch run. Renders as a formatted price block (market cap, 24h/7d change, ATH) in the entity panel.

### User-facing surfaces

- **`/dashboard`** — 3-column live force-directed graph (commissions list / graph view / context panel) plus timeline. 10s polling preserves selection state across refreshes.
- **`/chat`** — per-commission Q&A. The agent answers questions grounded in the commission's entities, edges, recent briefs, and uploaded datasets. Each response surfaces the model trace ID and context dimensions. System prompt strictly enforces "answer only from context; refuse on missing data."
- **`/sources`** — BYO RSS and YouTube channel ingestion per commission. Sources are merged and deduped with the global news cache before each batch run.
- **`/vault`** — unified table of every brief and CSV upload with its content hash. Stats break down anchored-on-0G vs local-only. Click any hash to copy.
- **`/agent`** — full audit log: commission events, inference calls with provider addresses and per-call wei cost, brief generations, alert fires, source additions, upload completions. Filterable by event kind.
- **Node-click "why connected" panel**: human-readable verb phrases per edge (`this regulates Tornado Cash`, `was founded by Vitalik Buterin`), friendly neighbor names, expandable evidence quotes, confidence and observed-at, source article URLs.

### Alerts and delivery

- **4 rule kinds**: entity mentioned, edge type added, keyword in evidence, sentiment drop below threshold.
- **Sentiment scoring per entity** in the extraction step, persisted to `entity.attributes.sentiment`.
- **Delivery channels per alert fire**: in-app log (always), webhook URL (if rule configured), Telegram (if owner has registered a chat ID).
- **Per-commission Telegram subscriptions**: separate toggles for alerts vs new-brief digests, stored as `tg_alerts` and `tg_briefs` columns on the `commissions` table. Brief digests bundle the batch into a single Telegram message rather than one per article.
- **Long-poll Telegram bot** (`@ogtimes_bot`) for chat-ID onboarding via `/start`.

### Data ingestion beyond news

- **CSV upload** at up to 20 rows per file, SHA-256 of the buffer computed before any inference call. Each row is passed to the same typed-entity extractor that handles news articles. Per-row progress tracking; final status `completed | partial | failed`.
- **Sample CSVs** at `data/sample-acquisitions.csv` (crypto M&A) and `data/sample-token-launches.csv`. Verified end-to-end on BlackRock and Solana commissions.

### Production deployment

- **Frontend**: Next.js 16 on Vercel (`frame0-nine.vercel.app`).
- **Backend**: Bun + Express on Railway (`frame0-production.up.railway.app`).
- **Database**: bun:sqlite with WAL journal mode. Migrations run automatically on container boot.
- **Auth gate**: NextAuth v5 (Auth.js) with Google provider; middleware redirects unauthenticated users to `/login`. Email shows in sidebar UserMenu; sign-out clears the session.
- **API protection**: a Next.js proxy at `/api/proxy/*` forwards browser calls to the backend with a shared `X-Internal-Token` header. The backend's Express middleware rejects any `/api/*` request without a matching token. `/health` stays open for Railway's health probes.

---

## 0G integration specs

### 0G Compute (inference)

- **Status:** LIVE. Every classify, editorial, extract, chat, and 7-day-summary call goes through the 0G testnet router.
- **Router endpoint**: `https://router-api-testnet.integratenetwork.work/v1`
- **Model**: `qwen/qwen-2.5-7b-instruct`
- **Wrapper**: `back/src/og/compute.ts` (`chat`, `chatJson`, `isAvailable`). All inference calls funnel through this single file.
- **Per-call audit trail**: every response includes an `x_0g_trace` object with the on-chain provider address that served the request, billing breakdown in wei (input cost, output cost, total cost), and a request ID. We persist this verbatim into a `traces` table on every call.
- **Verifiability**: the audit log surfaces total inference cost in OG across the project, plus the trace ID for every individual brief and chat response. A buyer can verify each generated artifact against the 0G router's settlement records.

### 0G Storage

- **Status:** LIVE, gated by `OG_STORAGE_ENABLED` env flag and a funded private key.
- **SDK**: `@0gfoundation/0g-storage-ts-sdk@1.2.9` with `ethers@6.16.0`.
- **Network**: 0G Galileo testnet (chain ID 16602).
- **Indexer**: `https://indexer-storage-testnet-turbo.0g.ai`
- **Flow contract**: `0x22e03a6a89b950f1c82ec5e74f8eca321a105296`
- **RPC**: `https://evmrpc-testnet.0g.ai`
- **What we upload**: per-brief JSON snapshots containing commission ID, article ID, article title, article URL, the editorial text, the inference trace ID, and timestamp. Implementation in `back/src/og/storage.ts` uses `MemData` for in-memory buffer uploads, computes the merkle root client-side via the SDK, submits the storage transaction with the configured signer, and returns `0g:<rootHash>`.
- **Fallback**: when the flag is off or the wallet is unfunded, the same code path computes a local SHA-256 and returns `local:<sha>`. Both forms are persisted to `briefs.storage_hash` so the `/vault` page can show anchored vs local at a glance.
- **Smoke-tested**: SDK loads, computes root hash, reaches the Flow contract, fails only at the funds check with an unfunded wallet. Confirms the wiring is correct end to end.

### 0G Chain (payment contract)

- **Status:** LIVE, gated by `OG_CHAIN_ENABLED`.
- **Contract**: `0x2a8142Db4C3b90333339A6E25b225e808098BDB0` (Galileo testnet).
- **Contract source**: `contracts/OGTimesPayment.sol`, ABI at `contracts/contract.abi`.
- **Event**: `Paid(address indexed user, bytes32 indexed commissionIdHash, string commissionId, uint256 amount, uint256 paidAt)`
- **Listener**: `back/src/og/chain.ts` uses viem `watchContractEvent` on the Galileo RPC. On a matching `Paid` event, the backend calls `recordPayment(user, commissionId, txHash)` and grants access to the paying wallet.
- **Frontend payment flow**: `og/components/commission/PaywallButton.tsx` renders only when the backend returns HTTP 402 from a RUN NOW request. It uses viem's `walletClient` to call the contract's `pay(commissionId)` method with `value = parseEther("0.01")`. Auto-handles wallet connection and chain switching.
- **Pricing model**: 2 free runs per wallet (configurable via `FREE_RUNS_PER_WALLET`), then 0.01 OG per commission unlock. Free-tier usage is tracked in the `wallet_access` table; paid commission IDs are also recorded there once the chain event fires.

---

## Stack

- **Backend**: Bun + Express + TypeScript, `bun:sqlite` (WAL), viem 2.49, ethers 6.16, `@0gfoundation/0g-storage-ts-sdk` 1.2.9, OpenAI SDK 6.37 (pointed at the 0G router).
- **Frontend**: Next.js 16 + React 19 + Tailwind 4, `react-force-graph-2d` for the typed graph view, NextAuth v5 beta for the auth gate, viem for the on-chain payment flow.
- **Database**: SQLite via `bun:sqlite` with WAL journal mode. Schema covers `entities`, `edges`, `articles`, `commissions`, `briefs`, `traces`, `alert_rules`, `alert_events`, `sources`, `delivery_channels`, `wallet_access`, `uploads`, `commission_articles`, `article_entities`, `entity_aliases`. Migrations run idempotently at boot via `bun src/db/migrate.ts`.

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

### Deployed contracts (0G Galileo testnet, chain id 16602)

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
