---
name: airhouse-backend
description: Use for implementing or modifying Airhouse backend APIs and database in this repository (Cloudflare Worker + Hono + Drizzle + Better Auth), including schema/migration sync, i18n translation tables, and release checks.
---

# Airhouse Backend Skill

## When to use
- Any change to `src/db/schema.ts`, `src/db/relations.ts`, or `drizzle/0000_initial.sql`
- Any API change under `src/routes/api`
- Better Auth wiring/guard changes (`auth-schema.ts`, `src/worker/index.ts`, middleware)
- Localization/i18n behavior for content endpoints

## Core workflow
1. Make schema/model changes in `src/db/schema.ts`.
2. Update relation graph in `src/db/relations.ts`.
3. Keep SQL bootstrap in `drizzle/0000_initial.sql` aligned with schema changes.
4. Update affected route handlers in `src/routes/api/*`.
5. Run quality gates:
: `bun run check`
: `bun run lint`
: `bun run build`
: `bun run test`

## Guardrails
- Keep API behavior backward compatible unless a breaking change is explicitly requested.
- If a column is removed from schema, remove all route usages in the same change.
- Prefer normalized tables for evolving data (`*_translations`, join tables, enums).
- For i18n reads, fallback to base language fields when translation is missing.
- Keep naming consistent across Drizzle schema, SQL tables, indexes, and route selections.

## Better Auth checklist
- `auth-schema.ts` and SQL auth tables must match.
- `createAuth()` in `src/worker/index.ts` should reflect actual auth fields.
- Protected routes must use `protect` middleware and `getSession` path.

## i18n checklist
- Translation table per translatable entity with unique `(entity_id, locale)`.
- API accepts `lang` (query/header) and falls back to base fields.
- Include locale in cache key strategy when caching is added.

## Project commands
- Dev: `bun run dev`
- Validate: `bun run check && bun run lint && bun run build && bun run test`
- Deploy: `bun run deploy`
