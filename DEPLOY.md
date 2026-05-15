# Deploy for hackathon

Goal: live URL judges can click. Frontend on Vercel, backend exposed via ngrok tunnel.

## Backend via ngrok

```bash
# 1. Install ngrok
brew install ngrok    # macOS
# or download from https://ngrok.com/download

# 2. Auth (free account, get token from ngrok dashboard)
ngrok config add-authtoken YOUR_AUTHTOKEN

# 3. Start backend
cd back
bun run dev   # listens on :4000

# 4. In another terminal — start tunnel
ngrok http 4000
# Copy the https URL it prints, e.g. https://abc-123.ngrok-free.app
```

The ngrok URL changes every time you restart it (free plan). For a stable URL during the demo period, leave the tunnel running.

## Frontend on Vercel

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. From the og/ directory
cd og
vercel

# Follow prompts. When asked for env vars, set:
#   NEXT_PUBLIC_API_URL=https://your-ngrok-url.ngrok-free.app
#   (no trailing slash)

# 3. Production deploy
vercel --prod
```

## CORS on backend

The backend only allows the frontend origin set by `FRONTEND_URL` env. Add the Vercel URL to `back/.env.local` before starting the backend:

```
FRONTEND_URL=http://localhost:3000,https://your-vercel-app.vercel.app
```

Restart the backend after editing.

## Smoke test before demo

1. Open the Vercel URL. Dashboard should load.
2. Pick a commission. Should show populated graph + briefs.
3. Click RUN NOW. Should complete in 15-25s with new brief + alert (if rule exists).
4. Audit log page should show recent events.

## If ngrok tunnel dies mid-demo

Have the recorded video as backup. The submission's "live URL" is nice-to-have; the video is the actual deliverable.
