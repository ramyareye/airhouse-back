# Airhouse Festival Backend

Cloudflare Worker API for Airhouse Festival v1.

## Prerequisites
- Bun `>= 1.2`
- Node.js `>= 20` (for Wrangler tooling)
- PostgreSQL database (Neon is recommended)
- Cloudflare account + Wrangler auth (`wrangler login`)

## API Scope
- `GET /health`
- `GET /api/artists`
- `GET /api/venues`
- `GET /api/schedules`
- `ALL /api/auth/*`
- `GET /api/users/me`

## 1. Install
```bash
bun install
```

## 2. Create Local Env File
Copy and fill local variables:
```bash
cp .dev.vars.example .dev.vars
```

Put credentials in `.dev.vars`:
- `DATABASE_URL` (Postgres connection string)
- `BETTER_AUTH_SECRET` (long random secret)
- `BETTER_AUTH_URL` (local or public API URL)
- `AUTH_TRUSTED_ORIGINS` (comma-separated web origins)
- `SENTRY_DSN` (optional)

Example local values:
```env
DATABASE_URL=postgresql://user:password@host:5432/db?sslmode=require&channel_binding=require
BETTER_AUTH_SECRET=replace-with-long-random-secret
BETTER_AUTH_URL=http://127.0.0.1:8787
AUTH_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
SENTRY_DSN=
```

## 3. Create Database
Create the target database in Postgres/Neon, then run the baseline migration:
```bash
psql "$DATABASE_URL" -f drizzle/0000_initial.sql
```

This creates:
- Better Auth tables: `user`, `session`, `account`, `verification`, `rate_limit`
- Festival tables: `artists`, `venues`, `schedules`, `schedule_artists`

## 4. Run Local Worker
```bash
bun run dev
```

Health check:
```bash
curl http://127.0.0.1:8787/health
```

## 5. Configure Cloudflare Vars and Secrets
Non-sensitive values can stay in `wrangler.json` (`vars`), but credentials should be set as secrets.

Set production secrets:
```bash
wrangler secret put DATABASE_URL
wrangler secret put BETTER_AUTH_SECRET
wrangler secret put SENTRY_DSN
```

Set/update non-secret vars in `wrangler.json`:
- `BETTER_AUTH_URL` (for example `https://api.airhouse.name`)
- `AUTH_TRUSTED_ORIGINS` (for example `https://airhouse.name,https://www.airhouse.name`)

## 6. Deploy
Dry run:
```bash
wrangler deploy --dry-run
```

Production deploy:
```bash
bun run deploy
```

## Sentry Verify
Sentry SDK is initialized in `src/worker/index.ts` via `Sentry.withSentry(...)`, and `nodejs_compat` is already enabled in `wrangler.json`.

To verify ingestion quickly, temporarily add this line inside a route handler:
```ts
setTimeout(() => {
  throw new Error("Sentry test error");
});
```

Then call the route once and confirm the error appears in Sentry.

## Commands
```bash
bun run dev
bun run build
bun run test
bun run cf-typegen
bun run deploy
```
