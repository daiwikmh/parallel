# Pitch script — 90 seconds

## Cold open (10s)
"This is Frame0. I commission a topic, an agent watches it for me, and pings me on Telegram when something material changes — with an audit trail signed by an on-chain inference provider."

## Demo (60s)

**Beat 1 — set up the watch (15s)**
- Open `/dashboard`. "Four commissions I'm tracking — Bitcoin, Ethereum, Solana, BlackRock. Each is a typed knowledge graph the agent has built from news."
- Click "Ethereum". "Force-directed graph of every entity and typed edge. Articles are nodes too. Each edge has a quoted evidence snippet."

**Beat 2 — the brief (15s)**
- Click `7d brief`. "Qwen-7B running on 0G Compute summarizes last week into one paragraph. Trace ID at the bottom links back to the inference call."
- Show the paragraph.

**Beat 3 — alerts (15s)**
- Open the AlertsManager. "I want to know when the SEC names Ethereum, or when something gets exploited."
- Show an existing rule. "When this fires it goes to my Telegram, my webhook, and my in-app log."

**Beat 4 — fire it live (15s)**
- Click RUN NOW. Show the agent picking an article, the brief appearing, then — phone visible in frame — the Telegram notification arriving.

**Beat 5 — BYO data (15s)**
- Open the Upload Dataset panel. Drop `sample-acquisitions.csv` into the BlackRock commission. "Watch the graph absorb my CSV in real time — same typed extraction pipeline, every row hashed before it goes anywhere. The content hash is committed; my data is mine."
- Point to the storage_uri readout. "Local hash today, 0G Storage Log CID once I flip the flag."

## Audit close (15s)
- Click "Audit Log" in sidebar.
- "Every action I just took, logged. Every inference call has a 0G request ID and the provider address that served it. Total spent so far in OG: visible there. No background polling — every entry is something I clicked."

## One-liner if asked "why does this matter?"
"Per-tenant private intelligence with a verifiable LLM trail. Crypto research desks today can't prove where their facts came from. We can."

---

# Recording notes

- Screen size: 1440×900 minimum. Record at 1920×1080.
- Use OBS or Loom. 30fps fine.
- Two scenes: laptop screen + phone (for the alert beat). If using Loom, record laptop only and inset phone via a separate phone-screen recording.
- Background music: skip. Voice over only.
- Length cap: 90 seconds. Hard.
- Upload to YouTube unlisted, paste link in submission.

# Submission text (paste into hackathon form)

Frame0 is a private intelligence platform built on 0G Compute. Users commission a topic, the agent ingests news (from cached providers, user-supplied RSS/YouTube feeds, and uploaded CSV datasets), and persists a typed knowledge graph + editorial brief per tenant. Alerts fire on entity mentions, edge type appearances, evidence keywords, or sentiment drops — delivered to Telegram, webhooks, and an in-app feed.

Every LLM call is captured from the 0G inference router with the provider's on-chain address, request_id, and cost in wei. The audit page surfaces this — every brief, every alert, every inference traces back to an on-chain identity and a billable event.

Stack: Bun + Express + SQLite (backend), Next.js 16 + React 19 + Tailwind 4 + react-force-graph-2d (frontend), MetaMask Connect EVM (wallet), 0G Galileo testnet for chain payment + inference router for compute.

Demo: [video URL]
Repo: [github URL]
Live: [vercel URL]
