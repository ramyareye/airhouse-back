# Airhouse Festival Backend Scope (v1)

This backend is now scoped to:
- Auth + users (`/api/auth/*`, `/api/users/me`)
- Artists (`/api/artists`)
- Venues (`/api/venues`)
- Schedules (`/api/schedules`)

Removed from this repo in v1 cleanup:
- Legacy commerce flow (orders, bundles, stripe, vouchers)
- Legacy taxonomy/content APIs (categories, tags, tips, areas, cities, countries)
- Legacy import scripts and non-core docs/tests

Database domain model for v1:
- `artists`
- `venues`
- `schedules`
- `schedule_artists`
- Better Auth tables from `auth-schema.ts`
