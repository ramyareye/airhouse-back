# Airhouse Platform

Backend + mobile app repository for https://www.the-airhouse.com/.

## Product Context
- This repo powers Airhouse backend APIs and the Expo React Native app in `app/`.
- Current focus: festival content delivery (`artists`, `venues`, `schedules`), auth, profile, and mobile local content browsing.
- Backend stack: Cloudflare Workers + Postgres (Neon) + Drizzle ORM + Hono.
- Mobile stack: Expo + React Native + React Navigation + React Query + local SQLite mirror.

## Current Domain Areas
- Artists
- Venues
- Schedules
- Stage-based festival discovery (Soop, Madang, Hanok, Maum, Baram, Jandi)
- Feed items (backend)
- Authentication and user identity/session tables

## Planned Feature Direction
- Interactive map support with venue coordinates and lookup.
- Stage/theme metadata in API (optional future) so mobile theming is server-driven.
- Personalized schedules/favorites synced across sessions.
- Ongoing content export pipeline improvements and cache invalidation ergonomics.

## Important Paths
### Backend
- `src/worker`: Worker entrypoint + env wiring
- `src/routes`: Hono route registration
- `src/routes/api`: API modules
- `src/routes/middlewares`: auth/error/cache helpers
- `src/db`: Drizzle schema, relations, and DB client
- `drizzle`: SQL migration files
- `docs`: project/product docs
- `wrangler.json`: Cloudflare Worker config

### Mobile App
- `app/`: Expo app project root
- `app/app/db`: local SQLite + Drizzle schema/init
- `app/app/data/content`: source schemas, sync orchestration, repository helpers
- `app/app/hooks/content`: React Query hooks for sync and local reads
- `app/app/pages/home`: festival home UI
- `app/app/pages/list`: schedule list UI with day/stage filters
- `app/app/pages/venues`: venue detail/list UI
- `app/app/navigation`: stack + tabs configuration

## Commands
### Backend
- `bun run dev`: local dev
- `bun run build`: type/build check
- `bun run test`: tests
- `bun run deploy`: deploy to Cloudflare Workers

### Mobile (`cd app`)
- `npm run start`: run Expo dev server
- `npx tsc --noEmit`: type check
- `npm run lint`: lint
