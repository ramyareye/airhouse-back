import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../../db/client";
import {
  artists,
  artistTranslations,
  feedItems,
  feedItemTranslations,
  scheduleArtists,
  schedules,
  scheduleTranslations,
  venues,
  venueTranslations,
} from "../../db/schema";
import { resolveFeaturedImageUrl } from "../../lib/media";
import type { Env } from "../../types/env";
import { cachePublic } from "../middlewares/cache.middlewares";

const contentApi = new Hono<{ Bindings: Env }>();
contentApi.use("/*", cachePublic());

contentApi.get("/all", async (c) => {
  const db = getDb(c.env.DATABASE_URL);

  const [artistRows, venueRows, scheduleRows, feedRows] = await Promise.all([
    db.select().from(artists).where(eq(artists.isPublished, true)).orderBy(asc(artists.name)),
    db.select().from(venues).where(eq(venues.isPublished, true)).orderBy(asc(venues.name)),
    db.select().from(schedules).where(eq(schedules.isPublished, true)).orderBy(asc(schedules.startsAt)),
    db.select().from(feedItems).orderBy(desc(feedItems.publishedAt)),
  ]);

  const [artistKoRows, venueKoRows, scheduleKoRows, feedKoRows, scheduleArtistRows] = await Promise.all([
    artistRows.length
      ? db
          .select()
          .from(artistTranslations)
          .where(
            and(
              eq(artistTranslations.locale, "ko"),
              inArray(
                artistTranslations.artistId,
                artistRows.map((row) => row.id),
              ),
            ),
          )
      : Promise.resolve([]),
    venueRows.length
      ? db
          .select()
          .from(venueTranslations)
          .where(
            and(
              eq(venueTranslations.locale, "ko"),
              inArray(
                venueTranslations.venueId,
                venueRows.map((row) => row.id),
              ),
            ),
          )
      : Promise.resolve([]),
    scheduleRows.length
      ? db
          .select()
          .from(scheduleTranslations)
          .where(
            and(
              eq(scheduleTranslations.locale, "ko"),
              inArray(
                scheduleTranslations.scheduleId,
                scheduleRows.map((row) => row.id),
              ),
            ),
          )
      : Promise.resolve([]),
    feedRows.length
      ? db
          .select()
          .from(feedItemTranslations)
          .where(
            and(
              eq(feedItemTranslations.locale, "ko"),
              inArray(
                feedItemTranslations.feedItemId,
                feedRows.map((row) => row.id),
              ),
            ),
          )
      : Promise.resolve([]),
    scheduleRows.length
      ? db
          .select()
          .from(scheduleArtists)
          .where(
            inArray(
              scheduleArtists.scheduleId,
              scheduleRows.map((row) => row.id),
            ),
          )
      : Promise.resolve([]),
  ]);

  const artistKoById = new Map(artistKoRows.map((row) => [row.artistId, row]));
  const venueKoById = new Map(venueKoRows.map((row) => [row.venueId, row]));
  const scheduleKoById = new Map(scheduleKoRows.map((row) => [row.scheduleId, row]));
  const feedKoById = new Map(feedKoRows.map((row) => [row.feedItemId, row]));

  const scheduleArtistIdsByScheduleId = new Map<string, string[]>();
  for (const row of scheduleArtistRows) {
    const current = scheduleArtistIdsByScheduleId.get(row.scheduleId) ?? [];
    current.push(row.artistId);
    scheduleArtistIdsByScheduleId.set(row.scheduleId, current);
  }

  return c.json({
    locales: ["en", "ko"],
    artists: artistRows.map((row) => {
      const ko = artistKoById.get(row.id);
      const { name, bio, ...base } = row;
      return {
        ...base,
        featuredImageUrl: resolveFeaturedImageUrl(row.imageUrl),
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
    venues: venueRows.map((row) => {
      const ko = venueKoById.get(row.id);
      const { name, description, ...base } = row;
      return {
        ...base,
        featuredImageUrl: resolveFeaturedImageUrl(row.imageUrl),
        featuredLogoUrl: resolveFeaturedImageUrl(row.logoUrl),
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
    schedules: scheduleRows.map((row) => {
      const ko = scheduleKoById.get(row.id);
      const { title, description, ...base } = row;
      return {
        ...base,
        artistIds: scheduleArtistIdsByScheduleId.get(row.id) ?? [],
        localized: {
          en: {
            title,
            description,
          },
          ko: {
            title: ko?.title ?? title,
            description: ko?.description ?? description,
          },
        },
      };
    }),
    feedItems: feedRows.map((row) => {
      const ko = feedKoById.get(row.id);
      const { title, body, linkLabel, ...base } = row;
      return {
        ...base,
        featuredImageUrl: resolveFeaturedImageUrl(row.imageUrl),
        localized: {
          en: {
            title,
            body,
            linkLabel,
          },
          ko: {
            title: ko?.title ?? title,
            body: ko?.body ?? body,
            linkLabel: ko?.linkLabel ?? linkLabel,
          },
        },
      };
    }),
  });
});

export default contentApi;
