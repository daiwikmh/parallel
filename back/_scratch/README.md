# back/_scratch

Code that exists but is NOT used by the running app. Kept on disk for history
and possible future revival. Nothing here is imported from `back/src/`.

## services-auth-sketch + controllers-auth-sketch

A Google OAuth implementation drafted earlier in the project. Never compiled,
never mounted. Specific reasons it cannot run as written:

- `services-auth-sketch/auth.service.ts:42–43` has a TypeScript syntax error
  (no ternary operator) and does not parse.
- Uses Prisma (`db.user`, `db.refreshToken`, `db.$transaction`) but Prisma is
  not installed and there is no schema file. The real DB is bun:sqlite with
  hand-rolled SQL.
- Imports `../lib/jwt`, `../../middleware/jwt`, `../../types/provider` — none
  of these files exist in the repo.
- Located outside `back/src/`, which is the only directory the server
  entrypoint imports from. The router was never mounted.

If you revisit this after the hackathon, expect ~3–5 hours of focused work
to (a) port the DB layer to bun:sqlite or install Prisma, (b) write the
missing JWT + middleware helpers, (c) move everything under `back/src/`,
(d) wire it into `server.ts`, (e) rip out the NextAuth flow on the
frontend and rebuild the sign-in UI.

The current production auth path is NextAuth v5 in the frontend (`og/auth.ts`).
