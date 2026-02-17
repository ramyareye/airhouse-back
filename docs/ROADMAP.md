# Airhouse Backend Roadmap

## Top TODO
- Multilingual content support (priority 1): introduce `*_translations` tables with locale fallback in API responses.

## Now
- Maintain stable APIs for:
  - `GET /api/artists`
  - `GET /api/venues`
  - `GET /api/schedules`
  - auth/user endpoints
- Keep DB schema clean and migration-first.

## Next
- Multilingual API rollout: add `lang` query/header support and include locale in cache keys.
- Map API foundations: expose venue coordinates and map-friendly query shapes.
- Static map tiles: serve pre-generated tiles as static assets (no on-request tile rendering).
- Feed improvements: support richer app feed filtering/sorting by visibility and publish time.

## Later
- User schedule features: "add to my schedule", "remove", "list my schedule".
- Personalized feed/schedule experiences based on user activity.
- Additional app modules (as product scope expands).

## Implementation Principles
- Prefer explicit schema and migrations over implicit runtime changes.
- Keep endpoints focused and composable.
- Optimize for predictable query performance and low operational complexity.
