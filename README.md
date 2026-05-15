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
| 0G Storage Log | Stub (returns `local:<hash>` content-addressed identifier when off) | Per-commission-run snapshot upload (brief + graph state) is wired through `back/src/og/storage.ts`. Real SDK call ships post-hackathon. |

Per-tenant private graph + verifiable LLM trail is the moat. Storage and chain commits are deliberately minimal per cycle to keep cost bounded.

---

## Architecture

```
back/                    # Bun + Express + TypeScript
  src/
    agent/               # classify, editorial, extract (typed entities + edges), runOnce
    alerts/              # rule engine, fires after each runOnce, delivers to TG + webhook + in-app
    api/                 # commissions, sources, alerts, agent (audit), graph, integrations, news
    db/                  # SQLite via bun:sqlite, schema.sql, repo.ts, migrate.ts, seed-demo.ts
    og/                  # compute.ts (inference wrapper), storage.ts (stub), chain.ts (event listener)
    payment/             # access.ts — describeAccess, consumeFreeUse, recordPayment
    worker/              # news providers (RSS, HN, Reddit, GitHub, Google News), price data, user sources
  data/                  # SQLite database (gitignored)

og/                      # Next.js 16 + React 19 + Tailwind 4
  app/(app)/             # dashboard, agent (audit log), sources
  app/(marketing)/       # landing, about, commission (legacy — not in app nav)
  components/
    commission/          # CommissionInput, CommissionsList, SourcesManager, AlertsManager
    dashboard/           # BriefPanel
    graph/               # GraphView (force-directed, react-force-graph-2d), ContextPanel, Timeline
    layout/              # AppShell, Sidebar (with wallet + Telegram sections)
    wallet/              # WalletProvider (MetaMask via @metamask/connect-evm), ConnectWallet, TelegramSection
  lib/
    api.ts               # typed HTTP client, sends X-Wallet-Address from localStorage
    wallet/              # chains (0G Galileo 16601), utils, lazy client singleton
```

---

## Run locally

```bash
# Backend
cd back
cp .env.example .env.local   # set OG_INFERENCE_API at minimum
bun install
bun src/db/migrate.ts        # creates schema + seeds top-30 ticker aliases
bun src/db/seed-demo.ts      # creates 4 demo commissions (Bitcoin, Ethereum, Solana, BlackRock)
bun run dev                  # localhost:4000

# Frontend (in another terminal)
cd og
npm install
npm run dev                  # localhost:3000
```

Open `http://localhost:3000/dashboard`. Pick a commission. Click RUN NOW. Watch the graph populate.

---

## Environment variables

```bash
# back/.env.local

# REQUIRED — 0G testnet inference (get key from 0G dashboard)
OG_INFERENCE_API=...
OG_INFERENCE_URL=https://router-api-testnet.integratenetwork.work/v1
OG_INFERENCE_MODEL=qwen/qwen-2.5-7b-instruct

# OPTIONAL — Telegram alert delivery
TG_BOT_TOKEN=...                       # from @BotFather
TG_BOT_USERNAME=YourBotName

# OPTIONAL — payment gate (default off — free during hackathon)
PAYMENT_ENABLED=false
FREE_RUNS_PER_WALLET=2
PRICE_PER_COMMISSION_WEI=10000000000000000   # 0.01 OG
OG_PAYMENT_CONTRACT=0x...                    # deployed on Galileo

# OPTIONAL — storage upload (default off — returns local:<sha> hash)
OG_STORAGE_ENABLED=false
OG_STORAGE_ENDPOINT=...
OG_STORAGE_PRIVATE_KEY=...

# OPTIONAL — chain event listener
OG_CHAIN_ENABLED=false
```

```bash
# og/.env.local

NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_INFURA_API_KEY=...   # optional, only needed for Sepolia switching
```

---

## Demo path (90 seconds)

1. Land on `/dashboard`. See 4 active commissions (Bitcoin, Ethereum, Solana, BlackRock), each with prices and existing graph nodes.
2. Click "Ethereum" → see force-directed graph + brief panel + sources panel + alerts panel.
3. Click `7d brief` → LLM-generated paragraph appears summarizing the last week's activity.
4. Click `+ new` in alerts → create rule "edge_type_added" with edge types `exploited, regulates`.
5. Click RUN NOW. Watch the graph add nodes, the brief appear, the alert fire (in-app log) and (if `TG_BOT_TOKEN` set) ping your phone.
6. Click Audit Log in sidebar → see every event from this session: commission selection, RUN NOW, inference calls (with 0G request IDs + provider addresses), brief generation, alert firing. Total OG spent: visible in the stats tile.

---

## What's intentionally manual

No background polling. No autonomous loops. Every agent action is triggered by an explicit user click. This is deliberate — keeps inference costs bounded and the audit trail meaningful (every entry corresponds to a real user intent).

---

## Known gaps (honest)

- 0G Storage Log SDK call is stubbed. Hash format `local:<sha>` instead of a real CID. Wiring is in place; flip `OG_STORAGE_ENABLED=true` and add the SDK call to ship.
- Payment gate is built and tested against a stub. Real chain event listener wires when contract deployment + ABI are pasted.
- Email digest delivery skipped — Telegram + Slack-via-webhook only.
- Single-user mode. `owner_id = wallet address (or 'anon')` everywhere; no multi-user workspace.
- Entity disambiguation handles top-30 crypto tickers reliably; outside that domain, occasional duplicates.

---

## License

MIT.
