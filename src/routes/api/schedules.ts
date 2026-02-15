import { Hono } from "hono";
import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { getDb } from "../../db/client";
import { artists, scheduleArtists, schedules, venues } from "../../db/schema";
import type { Env } from "../../types/env";

const schedulesApi = new Hono<{ Bindings: Env }>();

schedulesApi.get("/", async (c) => {
  const db = getDb(c.env.DATABASE_URL);
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
    filteredScheduleIds
      ? inArray(schedules.id, filteredScheduleIds)
      : undefined,
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
        city: venues.city,
      },
    })
    .from(schedules)
    .innerJoin(venues, eq(venues.id, schedules.venueId))
    .where(where)
    .orderBy(asc(schedules.startsAt))
    .limit(limit);

  const scheduleIds = events.map((event) => event.id);

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

  const artistsBySchedule = new Map<
    string,
    Array<{ id: string; name: string; slug: string }>
  >();

  for (const link of links) {
    const current = artistsBySchedule.get(link.scheduleId) ?? [];
    current.push({
      id: link.artistId,
      name: link.artistName,
      slug: link.artistSlug,
    });
    artistsBySchedule.set(link.scheduleId, current);
  }

  return c.json({
    schedules: events.map((event) => ({
      ...event,
      artists: artistsBySchedule.get(event.id) ?? [],
    })),
  });
});

schedulesApi.get("/:scheduleId", async (c) => {
  const scheduleId = c.req.param("scheduleId");
  const db = getDb(c.env.DATABASE_URL);

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
        city: venues.city,
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

  return c.json({ schedule: { ...event, artists: linkedArtists } });
});

export default schedulesApi;
