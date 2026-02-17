# Airhouse Backend

Backend for https://www.the-airhouse.com/.

## Product Context
- This repo powers app/web backend APIs for Airhouse experiences.
- Current focus: content delivery (artists, venues, schedules), auth, and user profile APIs.
- Infrastructure stack: Cloudflare Workers + Postgres (Neon) + Drizzle ORM + Hono.

## Current Domain Areas
- Artists
- Venues
- Schedules
- Feed items
- Authentication and user identity/session tables

## Planned Feature Direction
- Interactive map support: add map-related APIs and data structures for venue/location lookup.
- Static map tiles: serve tiles as static assets (Cloudflare static hosting/R2-backed strategy) rather than generating tiles at request time.
- Personalized schedules: user login + "add to my schedule" flow for saved events.

## Important Paths
- `src/worker`: Worker entrypoint + env wiring
- `src/routes`: Hono route registration
- `src/routes/api`: API modules
- `src/routes/middlewares`: auth/error/cache helpers
- `src/db`: Drizzle schema, relations, and DB client
- `drizzle`: SQL migration files
- `docs`: project/product docs
- `wrangler.json`: Cloudflare Worker config

## Commands
- `bun run dev`: local dev
- `bun run build`: type/build check
- `bun run test`: tests
- `bun run deploy`: deploy to Cloudflare Workers
