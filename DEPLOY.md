# Deploying to Railway with Google OAuth gate

The `(app)` routes (`/dashboard`, `/chat`, `/sources`, `/vault`, `/agent`) are
gated by NextAuth v5 with a Google provider. Marketing pages stay public.
Unauthenticated requests are redirected to `/login`.

This is access control only. There is no per-user data isolation yet — every
signed-in user operates on the same SQLite DB (`owner_id='anon'`). Acceptable
for hackathon / private demo, not for multi-tenant production.

## 1. Create the Google OAuth client (5 min, one-time)

1. Open <https://console.cloud.google.com/apis/credentials> and create or pick
   a project.
2. Configure the OAuth consent screen:
   - User type: `External`.
   - App name: `OG Times`.
   - User support email: yours.
   - Add yourself to **Test users** while the app is unpublished (otherwise
     non-test Google accounts get a "verification required" wall).
3. Click **Create Credentials → OAuth client ID**.
   - Application type: `Web application`.
   - Authorized redirect URIs (add BOTH while developing):
     - `http://localhost:3000/api/auth/callback/google`
     - `https://<your-railway-app>.up.railway.app/api/auth/callback/google`
4. Copy the **Client ID** and **Client secret**.

## 2. Frontend env vars (`og/.env.local` for local, Railway dashboard for prod)

```bash
AUTH_GOOGLE_ID=<client id from step 3>
AUTH_GOOGLE_SECRET=<client secret from step 3>

# Generate once with: openssl rand -base64 32
AUTH_SECRET=<random 32-byte base64 string>

# For Railway / any host other than localhost:
AUTH_TRUST_HOST=true
AUTH_URL=https://<your-railway-app>.up.railway.app

# Where the Next proxy forwards backend calls. Use Railway's private DNS
# in production so the backend has NO public URL.
BACKEND_INTERNAL_URL=http://<backend-service>.railway.internal:4000

# Must match BACKEND_INTERNAL_TOKEN set on the backend service.
# Generate once with: openssl rand -base64 32
BACKEND_INTERNAL_TOKEN=<random 32-byte base64 string>
```

NOTE: `NEXT_PUBLIC_API_URL` is no longer used. All browser API calls go through
the same-origin Next proxy at `/api/_back/*`, which checks the NextAuth session
and forwards to the backend with `X-Internal-Token`. The browser never sees the
backend URL.

Important: do NOT commit `og/.env.local`. Railway env vars live in the project
dashboard; never paste secrets into the repo or shell history.

## 3. Local smoke test

```bash
cd og && npm run dev
# open http://localhost:3000/dashboard
# you should be bounced to /login
# sign in with a Test User Google account
# you should land on /dashboard with your avatar in the sidebar
```

## 4. Railway deploy notes

Two services in the same Railway project: `frontend` (Next.js) and
`backend` (Bun + Express).

**Frontend service:**
- Public domain enabled (this is what users hit).
- All `AUTH_*` env vars set before first boot; NextAuth refuses to start
  with `AUTH_SECRET` missing.
- `BACKEND_INTERNAL_URL` and `BACKEND_INTERNAL_TOKEN` set as above.
- Custom domain → add a second redirect URI in Google Cloud Console and
  update `AUTH_URL`.

**Backend service:**
- Public domain DISABLED. The backend only listens on the Railway private
  network. Frontend reaches it via `<backend-service>.railway.internal`.
- Required env vars:
  - `BACKEND_INTERNAL_TOKEN` — must match the frontend's value.
  - `OG_INFERENCE_API`, `OG_INFERENCE_URL`, `OG_INFERENCE_MODEL`.
  - `TG_BOT_TOKEN` (if Telegram delivery is enabled).
  - `OG_CHAIN_ENABLED=true`, `OG_PAYMENT_CONTRACT=0x2a8142Db...` (if paywall
    is enabled).
  - `OG_STORAGE_ENABLED=true`, `OG_STORAGE_PRIVATE_KEY=...` (if storage
    anchoring is enabled — fund the wallet first).
  - `FRONTEND_URL=https://<frontend>.up.railway.app` (for CORS allowlist).
- `/health` stays open without the token so Railway's health probes work.

**Why this layout:** the backend's API surface is now unreachable from the
public internet. The only path in is: browser → Next session check → Next
proxy → private network → backend. A random visitor curling the backend
sees nothing — there's no public URL to curl.

## 5. Known gaps

- Any Google account passes the gate. Add an email allowlist when you have
  one — drop a `signIn` callback in `og/auth.ts` that checks
  `AUTH_ALLOWED_EMAILS`.
- Sign-out clears the NextAuth session cookie only; the wallet address stays
  in `localStorage`. Clear it manually if testing isolation.
- `BACKEND_INTERNAL_TOKEN` is the shared secret between proxy and backend.
  If it leaks, the backend is naked again. Rotate it whenever you suspect
  exposure.
- Multi-user data isolation is NOT solved by this. Every authed user still
  operates on the same SQLite DB (`owner_id='anon'`). Two signed-in users
  see each other's commissions/briefs/chats.
- Backend background workers (Telegram long-poll, 0G chain event listener)
  stay running 24/7 regardless of whether anyone is signed in — they're not
  request-triggered and they cost ~zero. If you want to scale-to-zero, you'll
  need to make those externally-triggered too.

---

# Original hackathon build log (BYO CSV + extraction pipeline)

00:00 — 00:10 · Schema + endpoint scaffold (10 min)
  - Add uploads table: id, commission_id, filename, mime, size, content_sha256, storage_uri, rows_total, rows_processed, entities_added, edges_added,
  status, error, created_at
  - Run migration with safe ALTER pattern (idempotent)
  - Create back/src/api/uploads.router.ts with stub POST /:commissionId (returns 200 with mocked metadata)
  - Mount in server.ts
  - Checkpoint: curl upload returns mocked JSON

  00:10 — 00:30 · 0G Storage SDK exploration — HARD STOP at 00:30 (20 min)
  - Search npm: @0glabs/0g-ts-sdk, @0glabs/0g-storage-client, @0g-labs/*
  - If a package exists with clear upload API: write a hello-world script that uploads a 100-byte buffer and gets a CID back
  - Bail-out at 00:30:
    - SDK works → keep going, wire back/src/og/storage.ts to call it
    - SDK doesn't work / no clear API → keep stub, README says "hash anchored locally; full 0G Storage Log SDK shipping post-hackathon"
  - Per [[feedback-no-overclaiming]], the README copy will reflect reality whichever way this lands

  00:30 — 00:50 · Real upload + parse (20 min)
  - bun add multer (memory storage, 1MB limit)
  - POST /api/commissions/:id/upload accepts multipart with field file
  - bun add papaparse for CSV parse with header row
  - Compute sha256(buffer) → store as content_sha256
  - Call uploadJSON({filename, sha256, rows: parsed}) → store result hash as storage_uri (e.g. local:abc... or og://Qm...)
  - INSERT uploads row, return {upload_id, sha256, storage_uri, rows_total}

  00:50 — 01:00 · Extract-from-row prompt (10 min)
  - New function extractFromRow(row, headers, commissionContext) in back/src/agent/extract.ts
  - Prompt template adapts existing extractor: "Given this CSV row with headers [X, Y, Z], extract entities + typed relationships matching our schema. Skip
  if relationships unclear."
  - Reuses existing validate() for domain/range enforcement
  - Returns same ExtractionResult shape — graph layer is unchanged

  Checkpoint: Hour 1 ends with: file uploads, hashes, stores metadata. No extraction yet.

  ---
  Hour 2 (01:00 — 02:00) — Extraction pipeline + frontend

  01:00 — 01:30 · Async extraction worker (30 min)
  - After upload row created, kick off async loop (don't block HTTP response — return 202 immediately with upload_id)
  - For each row up to 20 max: call extractFromRow → upsert entities → insert edges (with commission_id set, evidence = JSON of source row)
  - After each row: UPDATE uploads.rows_processed, entities_added, edges_added
  - Final status: completed | partial | failed
  - Wire alert engine: evaluateAndFire called once after all rows done with the merged extracted entities + edges
  - Checkpoint: poll GET /api/commissions/:id/uploads/:uploadId → see counters incrementing; force graph in dashboard adds new nodes live

  01:30 — 02:00 · Frontend upload UI (30 min)
  - New component UploadDataset.tsx placed at top of SourcesManager
  - File input + Upload button (or drag-drop if it costs 0 extra time — use <input type="file"> only otherwise)
  - On submit: POST → 202 → start polling GET /api/commissions/:id/uploads/:uploadId every 1s
  - Progress bar: rows_processed / rows_total
  - Completion toast: "Processed 18/20 rows · 23 new entities · 14 new edges · hash local:abc…"
  - Recent uploads list: filename + timestamp + hash + chainscan link (if anchored — defer that to next session)

  Checkpoint: Hour 2 ends with: upload from browser, watch graph populate live, see hash in UI.

  ---
  Hour 3 (02:00 — 03:00) — Sample data + audit + docs + smoke test

  02:00 — 02:20 · Sample CSVs + end-to-end smoke (20 min)
  - Write data/sample-acquisitions.csv (10 rows: Acquirer, Target, Year, Sector, Amount — populated with real-ish crypto M&A: Coinbase/Bison Trails,
  Kraken/Staked, etc.)
  - Write data/sample-token-launches.csv (10 rows: Token, Protocol, Launch Date, Founder, Chain)
  - Drop both into BlackRock and Solana commissions → verify visible graph growth + alerts firing if rules match

  02:20 — 02:40 · Audit log + activity (20 min)
  - Add upload_processed event to the audit feed query in back/src/db/repo.ts listAuditFeed
  - New row kind in frontend agent/page.tsx KIND_LABEL map: UPLOAD
  - Activity log entry per upload: "uploaded sample-acquisitions.csv → 18 rows · 23 entities · 14 edges · hash local:abc…"

  02:40 — 03:00 · Docs + memory + final polish (20 min)
  - README: new "Upload your data" section + sample CSV instructions
  - PITCH.md: insert new beat #5 — "I drop my own CSV. Watch the graph absorb it in real time. The hash is committed; my data is mine."
  - Update memory project_niche_and_blocks.md with what shipped
  - Last smoke test: full demo path including upload

  ---
  Bail-out matrix (cut if behind schedule)

  ┌─────────┬────────────────────────────────────────┬──────────────────────────────────────┐
  │ At time │               If broken                │                Cut to                │
  ├─────────┼────────────────────────────────────────┼──────────────────────────────────────┤
  │ 00:30   │ 0G Storage SDK fails                   │ Keep local: stub, README honest      │
  ├─────────┼────────────────────────────────────────┼──────────────────────────────────────┤
  │ 01:30   │ Async extraction loop fails            │ Synchronous loop, lower row cap to 5 │
  ├─────────┼────────────────────────────────────────┼──────────────────────────────────────┤
  │ 02:00   │ Frontend upload UI broken              │ Backend-only with curl in demo       │
  ├─────────┼────────────────────────────────────────┼──────────────────────────────────────┤
  │ 02:30   │ Sample CSV produces garbage extraction │ Tighten prompt, drop to 1 sample CSV │
  ├─────────┼────────────────────────────────────────┼──────────────────────────────────────┤
  │ 02:50   │ Anything still broken                  │ Revert all upload code, demo without │
  └─────────┴────────────────────────────────────────┴──────────────────────────────────────┘

  What I am NOT doing in 3 hours

  - Drag-and-drop with previews
  - Per-column type mapping wizard (LLM does it from headers)
  - Resume on partial failure
  - File types beyond CSV (no JSON, no Excel, no PDF)
  - Real chain-anchoring of the upload hash (separate feature; defer)
  - 0G Storage retrieval / browse-back (one-way upload only)

  Risks

  - Worst-case: SDK blows up + extraction is bad + frontend has a state bug. Triple-fail probability ~5%. Mitigation: bail-out matrix above + working
  baseline always intact.
  - Real cost: 20 rows × 1 inference call ≈ 20 calls per upload ≈ ~$0.0001 in OG. Negligible.
  - Demo CSV must produce visually rich graph extractions. I'll hand-craft the sample data so it produces ~15 entities + 10 edges reliably. If a judge
  uploads garbage, demo will still extract something; I'll prep an answer for "what about bad data?"

  What you do during the 3 hours

  - Hours 0–1: nothing, let me work
  - Hour 2: be on Telegram so we can do a live alert test mid-build
  - Hour 3: review the sample CSVs + give thumbs up to README/PITCH copy changes

  Confirm to start

  Reply "start" and I begin Hour 1 immediately.

  If you want any of these changed before I start: prompt template, row cap, schema fields, file size limit — say so now. Once I'm in Hour 1 I won't pause
  for revisions.