import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../../db/client";
import { scheduleArtists, schedules, scheduleTranslations } from "../../db/schema";
import type { Env } from "../../types/env";
import { cachePublic } from "../middlewares/cache.middlewares";

const schedulesApi = new Hono<{ Bindings: Env }>();
schedulesApi.use("/*", cachePublic());
const SUPPORTED_LOCALES = ["en", "ko"] as const;

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
    return c.json({ locales: SUPPORTED_LOCALES, schedules: [] });
  }

  const where = and(
    eq(schedules.isPublished, true),
    venueId ? eq(schedules.venueId, venueId) : undefined,
    from ? gte(schedules.startsAt, from) : undefined,
    to ? lte(schedules.startsAt, to) : undefined,
    filteredScheduleIds ? inArray(schedules.id, filteredScheduleIds) : undefined,
  );

  const rows = await db
    .select()
    .from(schedules)
    .where(where)
    .orderBy(asc(schedules.startsAt))
    .limit(limit);
  const scheduleIds = rows.map((row) => row.id);
  const [koRows, scheduleArtistRows] = await Promise.all([
    scheduleIds.length
      ? db
          .select()
          .from(scheduleTranslations)
          .where(
            and(
              eq(scheduleTranslations.locale, "ko"),
              inArray(scheduleTranslations.scheduleId, scheduleIds),
            ),
          )
      : Promise.resolve([]),
    scheduleIds.length
      ? db.select().from(scheduleArtists).where(inArray(scheduleArtists.scheduleId, scheduleIds))
      : Promise.resolve([]),
  ]);
  const koByScheduleId = new Map(koRows.map((row) => [row.scheduleId, row]));
  const artistIdsByScheduleId = new Map<string, string[]>();
  for (const row of scheduleArtistRows) {
    const current = artistIdsByScheduleId.get(row.scheduleId) ?? [];
    current.push(row.artistId);
    artistIdsByScheduleId.set(row.scheduleId, current);
  }

  return c.json({
    locales: SUPPORTED_LOCALES,
    schedules: rows.map((row) => {
      const ko = koByScheduleId.get(row.id);
      const { title, description, ...base } = row;
      return {
        ...base,
        artistIds: artistIdsByScheduleId.get(row.id) ?? [],
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
  });
});

schedulesApi.get("/:scheduleId", async (c) => {
  const scheduleId = c.req.param("scheduleId");
  const db = getDb(c.env.DATABASE_URL);

  const [row] = await db
    .select()
    .from(schedules)
    .where(and(eq(schedules.id, scheduleId), eq(schedules.isPublished, true)))
    .limit(1);

  if (!row) {
    return c.json({ error: "Schedule not found" }, 404);
  }

  const [[ko], scheduleArtistRows] = await Promise.all([
    db
      .select()
      .from(scheduleTranslations)
      .where(
        and(eq(scheduleTranslations.scheduleId, row.id), eq(scheduleTranslations.locale, "ko")),
      )
      .limit(1),
    db.select().from(scheduleArtists).where(eq(scheduleArtists.scheduleId, row.id)),
  ]);
  const { title, description, ...base } = row;

  return c.json({
    locales: SUPPORTED_LOCALES,
    schedule: {
      ...base,
      artistIds: scheduleArtistRows.map((link) => link.artistId),
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
    },
  });
});

export default schedulesApi;
