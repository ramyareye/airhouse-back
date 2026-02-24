import { and, asc, eq, ilike, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../../db/client";
import { venues, venueTranslations } from "../../db/schema";
import { DEFAULT_LOCALE, resolveLocale } from "../../lib/i18n";
import type { Env } from "../../types/env";
import { cachePublic } from "../middlewares/cache.middlewares";

const venuesApi = new Hono<{ Bindings: Env }>();
venuesApi.use("/*", cachePublic());

venuesApi.get("/", async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const locale = resolveLocale(c);
  const q = c.req.query("q")?.trim();
  const limit = Math.min(Math.max(Number(c.req.query("limit")) || 50, 1), 200);

  const where = and(eq(venues.isPublished, true), q ? ilike(venues.name, `%${q}%`) : undefined);

  const rows = await db.select().from(venues).where(where).orderBy(asc(venues.name)).limit(limit);

  if (locale === DEFAULT_LOCALE || rows.length === 0) {
    return c.json({ venues: rows });
  }

  const translations = await db
    .select()
    .from(venueTranslations)
    .where(
      and(
        eq(venueTranslations.locale, locale),
        inArray(
          venueTranslations.venueId,
          rows.map((row) => row.id),
        ),
      ),
    );

  const translationsByVenueId = new Map(
    translations.map((translation) => [translation.venueId, translation]),
  );

  return c.json({
    venues: rows.map((row) => {
      const translation = translationsByVenueId.get(row.id);
      if (!translation) return row;
      return {
        ...row,
        name: translation.name ?? row.name,
        description: translation.description ?? row.description,
      };
    }),
  });
});

venuesApi.get("/:venueId", async (c) => {
  const venueId = c.req.param("venueId");
  const db = getDb(c.env.DATABASE_URL);
  const locale = resolveLocale(c);

  const [row] = await db
    .select()
    .from(venues)
    .where(and(eq(venues.id, venueId), eq(venues.isPublished, true)))
    .limit(1);

  if (!row) {
    return c.json({ error: "Venue not found" }, 404);
  }

  if (locale === DEFAULT_LOCALE) {
    return c.json({ venue: row });
  }

  const [translation] = await db
    .select()
    .from(venueTranslations)
    .where(and(eq(venueTranslations.venueId, row.id), eq(venueTranslations.locale, locale)))
    .limit(1);

  return c.json({
    venue: translation
      ? {
          ...row,
          name: translation.name ?? row.name,
          description: translation.description ?? row.description,
        }
      : row,
  });
});

export default venuesApi;
