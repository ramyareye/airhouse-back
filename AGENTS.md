# Airhouse Festival Backend

Description: Cloudflare Worker API + Postgres access for Airhouse Festival. Handles content APIs (artists/venues/schedules/etc), auth, purchases/orders, caching, and shared backend logic.
Package manager: Bun (`bun` / `bunx`).

Key paths:
- src/worker: Worker entrypoint + env wiring
- src/routes: Hono routes (HTTP API)
- src/routes/api: API modules (cities, venues, areas, bundles, tags, auth, user, etc.)
- src/routes/middlewares: cache/auth helpers
- src/db: Drizzle schema + DB client
- src/lib: shared utilities (e.g. media URL normalization)
- drizzle: SQL migrations
- docs: project docs (cost model, analytics events, QA notes)
- wrangler.json: Worker config + env vars

Commands:
- bun run dev: local dev server
- bun run build: production build
- bun run deploy: deploy to Cloudflare Workers
