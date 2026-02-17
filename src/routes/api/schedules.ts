import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../../db/client";
import {
  artists,
  artistTranslations,
  scheduleArtists,
  schedules,
  scheduleTranslations,
  venues,
  venueTranslations,
} from "../../db/schema";
import { DEFAULT_LOCALE, resolveLocale } from "../../lib/i18n";
import type { Env } from "../../types/env";

const schedulesApi = new Hono<{ Bindings: Env }>();

schedulesApi.get("/", async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const locale = resolveLocale(c);
  const venueId = c.req.query("venueId")?.trim();
  const artistId = c.req.query("artistId")?.trim();
  const from = c.req.query("from")?.trim();
  const to = c.req.query("to")?.trim();
  const limit = Math.min(Math.max(Number(c.req.query("limit")) || 100, 1), 300);

  const artistScheduleIds = artistId
    ? await db
        .select({ scheduleId: scheduleArtists.scheduleId })
        .from(scheduleArtists)
        .where(eq(scheduleArtists.artistId, artistId))
    : null;

  const filteredScheduleIds = artistScheduleIds?.map((row) => row.scheduleId) ?? null;
  if (filteredScheduleIds && filteredScheduleIds.length === 0) {
    return c.json({ schedules: [] });
  }

  const where = and(
    eq(schedules.isPublished, true),
    venueId ? eq(schedules.venueId, venueId) : undefined,
    from ? gte(schedules.startsAt, from) : undefined,
    to ? lte(schedules.startsAt, to) : undefined,
    filteredScheduleIds ? inArray(schedules.id, filteredScheduleIds) : undefined,
  );

  const events = await db
    .select({
      id: schedules.id,
      slug: schedules.slug,
      title: schedules.title,
      description: schedules.description,
      startsAt: schedules.startsAt,
      endsAt: schedules.endsAt,
      venue: {
        id: venues.id,
        name: venues.name,
        slug: venues.slug,
      },
    })
    .from(schedules)
    .innerJoin(venues, eq(venues.id, schedules.venueId))
    .where(where)
    .orderBy(asc(schedules.startsAt))
    .limit(limit);

  const scheduleIds = events.map((event) => event.id);
  const venueIds = events.map((event) => event.venue.id);

  const links = scheduleIds.length
    ? await db
        .select({
          scheduleId: scheduleArtists.scheduleId,
          artistId: artists.id,
          artistName: artists.name,
          artistSlug: artists.slug,
        })
        .from(scheduleArtists)
        .innerJoin(artists, eq(artists.id, scheduleArtists.artistId))
        .where(inArray(scheduleArtists.scheduleId, scheduleIds))
    : [];

  const artistsBySchedule = new Map<string, Array<{ id: string; name: string; slug: string }>>();

  for (const link of links) {
    const current = artistsBySchedule.get(link.scheduleId) ?? [];
    current.push({
      id: link.artistId,
      name: link.artistName,
      slug: link.artistSlug,
    });
    artistsBySchedule.set(link.scheduleId, current);
  }

  if (locale === DEFAULT_LOCALE) {
    return c.json({
      schedules: events.map((event) => ({
        ...event,
        artists: artistsBySchedule.get(event.id) ?? [],
      })),
    });
  }

  const [scheduleI18n, venueI18n, artistI18n] = await Promise.all([
    scheduleIds.length
      ? db
          .select()
          .from(scheduleTranslations)
          .where(
            and(
              eq(scheduleTranslations.locale, locale),
              inArray(scheduleTranslations.scheduleId, scheduleIds),
            ),
          )
      : Promise.resolve([]),
    venueIds.length
      ? db
          .select()
          .from(venueTranslations)
          .where(
            and(eq(venueTranslations.locale, locale), inArray(venueTranslations.venueId, venueIds)),
          )
      : Promise.resolve([]),
    links.length
      ? db
          .select()
          .from(artistTranslations)
          .where(
            and(
              eq(artistTranslations.locale, locale),
              inArray(
                artistTranslations.artistId,
                links.map((link) => link.artistId),
              ),
            ),
          )
      : Promise.resolve([]),
  ]);

  const scheduleI18nById = new Map(
    scheduleI18n.map((translation) => [translation.scheduleId, translation]),
  );
  const venueI18nById = new Map(venueI18n.map((translation) => [translation.venueId, translation]));
  const artistI18nById = new Map(
    artistI18n.map((translation) => [translation.artistId, translation]),
  );

  return c.json({
    schedules: events.map((event) => ({
      ...event,
      title: scheduleI18nById.get(event.id)?.title ?? event.title,
      description: scheduleI18nById.get(event.id)?.description ?? event.description,
      venue: {
        ...event.venue,
        name: venueI18nById.get(event.venue.id)?.name ?? event.venue.name,
      },
      artists: (artistsBySchedule.get(event.id) ?? []).map((artist) => ({
        ...artist,
        name: artistI18nById.get(artist.id)?.name ?? artist.name,
      })),
    })),
  });
});

schedulesApi.get("/:scheduleId", async (c) => {
  const scheduleId = c.req.param("scheduleId");
  const db = getDb(c.env.DATABASE_URL);
  const locale = resolveLocale(c);

  const [event] = await db
    .select({
      id: schedules.id,
      slug: schedules.slug,
      title: schedules.title,
      description: schedules.description,
      startsAt: schedules.startsAt,
      endsAt: schedules.endsAt,
      venue: {
        id: venues.id,
        name: venues.name,
        slug: venues.slug,
      },
    })
    .from(schedules)
    .innerJoin(venues, eq(venues.id, schedules.venueId))
    .where(and(eq(schedules.id, scheduleId), eq(schedules.isPublished, true)))
    .limit(1);

  if (!event) {
    return c.json({ error: "Schedule not found" }, 404);
  }

  const linkedArtists = await db
    .select({
      id: artists.id,
      name: artists.name,
      slug: artists.slug,
    })
    .from(scheduleArtists)
    .innerJoin(artists, eq(artists.id, scheduleArtists.artistId))
    .where(eq(scheduleArtists.scheduleId, scheduleId))
    .orderBy(asc(artists.name));

  if (locale === DEFAULT_LOCALE) {
    return c.json({ schedule: { ...event, artists: linkedArtists } });
  }

  const [scheduleI18n, venueI18n, artistI18n] = await Promise.all([
    db
      .select()
      .from(scheduleTranslations)
      .where(
        and(eq(scheduleTranslations.scheduleId, event.id), eq(scheduleTranslations.locale, locale)),
      )
      .limit(1),
    db
      .select()
      .from(venueTranslations)
      .where(
        and(eq(venueTranslations.venueId, event.venue.id), eq(venueTranslations.locale, locale)),
      )
      .limit(1),
    linkedArtists.length
      ? db
          .select()
          .from(artistTranslations)
          .where(
            and(
              eq(artistTranslations.locale, locale),
              inArray(
                artistTranslations.artistId,
                linkedArtists.map((artist) => artist.id),
              ),
            ),
          )
      : Promise.resolve([]),
  ]);

  const artistI18nById = new Map(
    artistI18n.map((translation) => [translation.artistId, translation]),
  );

  return c.json({
    schedule: {
      ...event,
      title: scheduleI18n[0]?.title ?? event.title,
      description: scheduleI18n[0]?.description ?? event.description,
      venue: {
        ...event.venue,
        name: venueI18n[0]?.name ?? event.venue.name,
      },
      artists: linkedArtists.map((artist) => ({
        ...artist,
        name: artistI18nById.get(artist.id)?.name ?? artist.name,
      })),
    },
  });
});

export default schedulesApi;
