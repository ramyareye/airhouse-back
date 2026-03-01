import { and, asc, eq, ilike, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../../db/client";
import { venues, venueTranslations } from "../../db/schema";
import { resolveFeaturedImageUrl } from "../../lib/media";
import type { Env } from "../../types/env";
import { cachePublic } from "../middlewares/cache.middlewares";

const venuesApi = new Hono<{ Bindings: Env }>();
venuesApi.use("/*", cachePublic());
const SUPPORTED_LOCALES = ["en", "ko"] as const;

venuesApi.get("/", async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const q = c.req.query("q")?.trim();
  const limit = Math.min(Math.max(Number(c.req.query("limit")) || 50, 1), 200);

  const where = and(eq(venues.isPublished, true), q ? ilike(venues.name, `%${q}%`) : undefined);

  const rows = await db.select().from(venues).where(where).orderBy(asc(venues.name)).limit(limit);
  const resolvedRows = rows.map((row) => ({
    ...row,
    imageUrl: resolveFeaturedImageUrl(row.imageUrl),
    logoUrl: resolveFeaturedImageUrl(row.logoUrl),
    featuredImageUrl: resolveFeaturedImageUrl(row.imageUrl),
    featuredLogoUrl: resolveFeaturedImageUrl(row.logoUrl),
  }));
  const koRows = rows.length
    ? await db
        .select()
        .from(venueTranslations)
        .where(
          and(
            eq(venueTranslations.locale, "ko"),
            inArray(
              venueTranslations.venueId,
              rows.map((row) => row.id),
            ),
          ),
        )
    : [];
  const koByVenueId = new Map(koRows.map((row) => [row.venueId, row]));

  return c.json({
    locales: SUPPORTED_LOCALES,
    venues: resolvedRows.map((row) => {
      const ko = koByVenueId.get(row.id);
      const { name, description, ...base } = row;
      return {
        ...base,
        localized: {
          en: {
            name,
            description,
          },
          ko: {
            name: ko?.name ?? name,
            description: ko?.description ?? description,
          },
        },
      };
    }),
  });
});

venuesApi.get("/:venueId", async (c) => {
  const venueId = c.req.param("venueId");
  const db = getDb(c.env.DATABASE_URL);

  const [row] = await db
    .select()
    .from(venues)
    .where(and(eq(venues.id, venueId), eq(venues.isPublished, true)))
    .limit(1);

  if (!row) {
    return c.json({ error: "Venue not found" }, 404);
  }

  const resolvedRow = {
    ...row,
    imageUrl: resolveFeaturedImageUrl(row.imageUrl),
    logoUrl: resolveFeaturedImageUrl(row.logoUrl),
    featuredImageUrl: resolveFeaturedImageUrl(row.imageUrl),
    featuredLogoUrl: resolveFeaturedImageUrl(row.logoUrl),
  };

  const [ko] = await db
    .select()
    .from(venueTranslations)
    .where(and(eq(venueTranslations.venueId, row.id), eq(venueTranslations.locale, "ko")))
    .limit(1);

  const { name, description, ...base } = resolvedRow;

  return c.json({
    locales: SUPPORTED_LOCALES,
    venue: {
      ...base,
      localized: {
        en: {
          name,
          description,
        },
        ko: {
          name: ko?.name ?? name,
          description: ko?.description ?? description,
        },
      },
    },
  });
});

export default venuesApi;
