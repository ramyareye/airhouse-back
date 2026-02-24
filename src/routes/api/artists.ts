import { and, asc, eq, ilike, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../../db/client";
import { artists, artistTranslations } from "../../db/schema";
import { DEFAULT_LOCALE, resolveLocale } from "../../lib/i18n";
import type { Env } from "../../types/env";
import { cachePublic } from "../middlewares/cache.middlewares";

const artistsApi = new Hono<{ Bindings: Env }>();
artistsApi.use("/*", cachePublic());

artistsApi.get("/", async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const locale = resolveLocale(c);
  const q = c.req.query("q")?.trim();
  const limit = Math.min(Math.max(Number(c.req.query("limit")) || 50, 1), 200);

  const where = and(eq(artists.isPublished, true), q ? ilike(artists.name, `%${q}%`) : undefined);

  const rows = await db.select().from(artists).where(where).orderBy(asc(artists.name)).limit(limit);

  if (locale === DEFAULT_LOCALE || rows.length === 0) {
    return c.json({ artists: rows });
  }

  const translations = await db
    .select()
    .from(artistTranslations)
    .where(
      and(
        eq(artistTranslations.locale, locale),
        inArray(
          artistTranslations.artistId,
          rows.map((row) => row.id),
        ),
      ),
    );

  const translationsByArtistId = new Map(
    translations.map((translation) => [translation.artistId, translation]),
  );

  return c.json({
    artists: rows.map((row) => {
      const translation = translationsByArtistId.get(row.id);
      if (!translation) return row;
      return {
        ...row,
        name: translation.name ?? row.name,
        bio: translation.bio ?? row.bio,
      };
    }),
  });
});

artistsApi.get("/:artistId", async (c) => {
  const artistId = c.req.param("artistId");
  const db = getDb(c.env.DATABASE_URL);
  const locale = resolveLocale(c);

  const [row] = await db
    .select()
    .from(artists)
    .where(and(eq(artists.id, artistId), eq(artists.isPublished, true)))
    .limit(1);

  if (!row) {
    return c.json({ error: "Artist not found" }, 404);
  }

  if (locale === DEFAULT_LOCALE) {
    return c.json({ artist: row });
  }

  const [translation] = await db
    .select()
    .from(artistTranslations)
    .where(and(eq(artistTranslations.artistId, row.id), eq(artistTranslations.locale, locale)))
    .limit(1);

  return c.json({
    artist: translation
      ? {
          ...row,
          name: translation.name ?? row.name,
          bio: translation.bio ?? row.bio,
        }
      : row,
  });
});

export default artistsApi;
