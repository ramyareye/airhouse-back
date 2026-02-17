# Airhouse Backend Project Brief

## Overview
This repository contains the backend API for Airhouse (`https://www.the-airhouse.com/`), built for Cloudflare Workers with a Postgres data layer.

## Goals
- Provide stable content APIs for artists, venues, schedules, and feed.
- Provide authentication and user identity/session APIs.
- Keep API and schema design simple, modular, and easy to evolve.

## Technical Stack
- Runtime: Cloudflare Workers
- HTTP framework: Hono
- Database: Postgres (Neon recommended)
- ORM: Drizzle
- Auth: Better Auth
- Package manager: Bun

## Architecture Notes
- Route handlers live in `src/routes/api`.
- Shared DB contracts live in `src/db/schema.ts` and `src/db/relations.ts`.
- Baseline SQL setup is in `drizzle/0000_initial.sql`.
- Worker/environment wiring is in `src/worker/index.ts`.

## Product Evolution
Planned roadmap beyond current v1:
- map APIs and location-rich venue data
- static map tile serving strategy
- user-specific schedule features (save/add/remove schedule items)
