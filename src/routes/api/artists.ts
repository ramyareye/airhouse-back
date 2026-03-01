import { and, asc, eq, ilike, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../../db/client";
import { artists, artistTranslations } from "../../db/schema";
import { resolveFeaturedImageUrl } from "../../lib/media";
import type { Env } from "../../types/env";
import { cachePublic } from "../middlewares/cache.middlewares";

const artistsApi = new Hono<{ Bindings: Env }>();
artistsApi.use("/*", cachePublic());
const SUPPORTED_LOCALES = ["en", "ko"] as const;

artistsApi.get("/", async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const q = c.req.query("q")?.trim();
  const limit = Math.min(Math.max(Number(c.req.query("limit")) || 50, 1), 200);

  const where = and(eq(artists.isPublished, true), q ? ilike(artists.name, `%${q}%`) : undefined);

  const rows = await db.select().from(artists).where(where).orderBy(asc(artists.name)).limit(limit);
  const resolvedRows = rows.map((row) => ({
    ...row,
    imageUrl: resolveFeaturedImageUrl(row.imageUrl),
    featuredImageUrl: resolveFeaturedImageUrl(row.imageUrl),
  }));
  const koRows = rows.length
    ? await db
        .select()
        .from(artistTranslations)
        .where(
          and(
            eq(artistTranslations.locale, "ko"),
            inArray(
              artistTranslations.artistId,
              rows.map((row) => row.id),
            ),
          ),
        )
    : [];
  const koByArtistId = new Map(koRows.map((row) => [row.artistId, row]));

  return c.json({
    locales: SUPPORTED_LOCALES,
    artists: resolvedRows.map((row) => {
      const ko = koByArtistId.get(row.id);
      const { name, bio, ...base } = row;
      return {
        ...base,
        localized: {
          en: {
            name,
            bio,
          },
          ko: {
            name: ko?.name ?? name,
            bio: ko?.bio ?? bio,
          },
        },
      };
    }),
  });
});

artistsApi.get("/:artistId", async (c) => {
  const artistId = c.req.param("artistId");
  const db = getDb(c.env.DATABASE_URL);

  const [row] = await db
    .select()
    .from(artists)
    .where(and(eq(artists.id, artistId), eq(artists.isPublished, true)))
    .limit(1);

  if (!row) {
    return c.json({ error: "Artist not found" }, 404);
  }

  const resolvedRow = {
    ...row,
    imageUrl: resolveFeaturedImageUrl(row.imageUrl),
    featuredImageUrl: resolveFeaturedImageUrl(row.imageUrl),
  };

  const [ko] = await db
    .select()
    .from(artistTranslations)
    .where(and(eq(artistTranslations.artistId, row.id), eq(artistTranslations.locale, "ko")))
    .limit(1);

  const { name, bio, ...base } = resolvedRow;

  return c.json({
    locales: SUPPORTED_LOCALES,
    artist: {
      ...base,
      localized: {
        en: {
          name,
          bio,
        },
        ko: {
          name: ko?.name ?? name,
          bio: ko?.bio ?? bio,
        },
      },
    },
  });
});

export default artistsApi;
