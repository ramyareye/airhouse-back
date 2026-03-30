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
- `GET /api/content/all`
- `POST /api/content/export`
- `ALL /api/auth/*`
- `GET /api/users/me`

## Auth Flows
- Email/password sign up and sign in via Better Auth
- Email verification and password reset via Resend when enabled
- Phone number OTP verification, phone sign-in, and phone password reset via Twilio when enabled
- Google and Apple OAuth can be enabled later by setting provider credentials

Detailed auth contract, app wiring, and current gaps:
- `../docs/auth.md`

## Content Export
Trigger a content snapshot export to R2:

```bash
curl -X POST "https://api.airhouse.name/api/content/export" \
  -H "Authorization: Bearer $CONTENT_EXPORT_TOKEN"
```

Required bindings:
- `CONTENT_EXPORT_BUCKET` as an `r2_buckets` binding (not `vars`/secret)
- `CONTENT_EXPORT_TOKEN` as a secret
- optional `CONTENT_EXPORT_PREFIX` in `vars` (default: `content-exports`)

Export writes plain JSON files for `artists`, `venues`, and `schedules`:
- latest alias: `name.json`
- day alias: `name-YYYY-MM-DD.json`
- backup path: `backups/<timestamp>/name.json`
- backup + day alias: `backups/<timestamp>/name-YYYY-MM-DD.json`

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
- `AUTH_TRUSTED_ORIGINS` (comma-separated trusted origins and native schemes)
- `EMAIL_VERIFICATION_ENABLED` / `REQUIRE_EMAIL_VERIFICATION` (`0` or `1`)
- `RESEND_API_KEY` + `EMAIL_FROM` for verification and reset emails
- `PHONE_AUTH_ENABLED` / `PHONE_AUTH_REQUIRE_VERIFICATION` (`0` or `1`)
- `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_FROM_PHONE_NUMBER` for SMS OTP delivery
- `GOOGLE_OAUTH_CLIENT_ID` + `GOOGLE_OAUTH_CLIENT_SECRET` for Google login
- `APPLE_OAUTH_CLIENT_ID` + `APPLE_OAUTH_CLIENT_SECRET` for Apple login
- `APPLE_OAUTH_APP_BUNDLE_IDENTIFIER` for native Apple ID token verification later
- `SENTRY_DSN` (optional)

Example local values:
```env
DATABASE_URL=postgresql://user:password@host:5432/db?sslmode=require&channel_binding=require
BETTER_AUTH_SECRET=replace-with-long-random-secret
BETTER_AUTH_URL=http://127.0.0.1:8787
AUTH_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,airhouseapp://
EMAIL_VERIFICATION_ENABLED=0
REQUIRE_EMAIL_VERIFICATION=0
RESEND_API_KEY=
EMAIL_FROM=
PHONE_AUTH_ENABLED=0
PHONE_AUTH_REQUIRE_VERIFICATION=1
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_PHONE_NUMBER=
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
APPLE_OAUTH_CLIENT_ID=
APPLE_OAUTH_CLIENT_SECRET=
APPLE_OAUTH_APP_BUNDLE_IDENTIFIER=
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

The auth bootstrap now includes `user.phone_number` and `user.phone_number_verified` for phone-based flows.

If your database already exists, apply the forward migration too:
```bash
psql "$DATABASE_URL" -f drizzle/0001_auth_phone_columns.sql
```

Or use the repo migration runner instead:
```bash
bun run db:migrate:local
```

For remote/prod, provide the target database URL explicitly:
```bash
DATABASE_URL='postgresql://...' bun run db:migrate:remote
```

The runner applies `drizzle/*.sql` in order and records applied files in `schema_migrations`.

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
