# Airhouse Festival Backend

Cloudflare Worker API for Airhouse Festival v1.

## API Scope
- `GET /health`
- `GET /api/artists`
- `GET /api/venues`
- `GET /api/schedules`
- `ALL /api/auth/*`
- `GET /api/users/me`

## Local Development
```bash
bun install
bun run dev
```

## Environment
Set in `.dev.vars` or Wrangler secrets:
- `DATABASE_URL`
- `BETTER_AUTH_URL`
- `BETTER_AUTH_SECRET`
- `AUTH_TRUSTED_ORIGINS` (comma-separated)
- `SENTRY_DSN` (optional)

## Commands
```bash
bun run dev
bun run build
bun run test
bun run deploy
```
