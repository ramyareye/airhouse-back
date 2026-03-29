import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { getDb } from "../../db/client";
import { scheduleArtists, schedules, scheduleTranslations } from "../../db/schema";
import type { Env } from "../../types/env";
import { cachePublic } from "../middlewares/cache.middlewares";

const SUPPORTED_LOCALES = ["en", "ko"] as const;
const LocaleSchema = z.enum(SUPPORTED_LOCALES);
const ScheduleLocalizedSchema = z
  .object({
    title: z.string().nullable(),
    description: z.string().nullable(),
  })
  .openapi("ScheduleLocalizedFields");
const ScheduleSchema = z
  .object({
    id: z.string(),
    artistIds: z.array(z.string()),
    localized: z.object({
      en: ScheduleLocalizedSchema,
      ko: ScheduleLocalizedSchema,
    }),
  })
  .catchall(z.unknown())
  .openapi("Schedule");
const ScheduleListResponseSchema = z
  .object({
    locales: z.array(LocaleSchema),
    schedules: z.array(ScheduleSchema),
  })
  .openapi("ScheduleListResponse");
const ScheduleDetailResponseSchema = z
  .object({
    locales: z.array(LocaleSchema),
    schedule: ScheduleSchema,
  })
  .openapi("ScheduleDetailResponse");
const ErrorSchema = z
  .object({
    error: z.string(),
  })
  .openapi("ScheduleApiError");
const listSchedulesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Festival Content"],
  summary: "List published schedules",
  request: {
    query: z.object({
      venueId: z
        .string()
        .optional()
        .openapi({ param: { name: "venueId", in: "query" } }),
      artistId: z
        .string()
        .optional()
        .openapi({ param: { name: "artistId", in: "query" } }),
      from: z
        .string()
        .optional()
        .openapi({ param: { name: "from", in: "query" } }),
      to: z
        .string()
        .optional()
        .openapi({ param: { name: "to", in: "query" } }),
      limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(300)
        .default(100)
        .openapi({
          param: { name: "limit", in: "query" },
          example: 100,
        }),
    }),
  },
  responses: {
    200: {
      description: "Schedules retrieved successfully.",
      content: {
        "application/json": {
          schema: ScheduleListResponseSchema,
        },
      },
    },
  },
});
const getScheduleRoute = createRoute({
  method: "get",
  path: "/{scheduleId}",
  tags: ["Festival Content"],
  summary: "Fetch a published schedule",
  request: {
    params: z.object({
      scheduleId: z.string().openapi({
        param: { name: "scheduleId", in: "path" },
      }),
    }),
  },
  responses: {
    200: {
      description: "Schedule retrieved successfully.",
      content: {
        "application/json": {
          schema: ScheduleDetailResponseSchema,
        },
      },
    },
    404: {
      description: "Schedule not found.",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

const schedulesApi = new OpenAPIHono<{ Bindings: Env }>();
schedulesApi.use("/*", cachePublic());

schedulesApi.openapi(listSchedulesRoute, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const { venueId, artistId, from, to, limit } = c.req.valid("query");

  const artistScheduleIds = artistId
    ? await db
        .select({ scheduleId: scheduleArtists.scheduleId })
        .from(scheduleArtists)
        .where(eq(scheduleArtists.artistId, artistId))
    : null;

  const filteredScheduleIds = artistScheduleIds?.map((row) => row.scheduleId) ?? null;
  if (filteredScheduleIds && filteredScheduleIds.length === 0) {
    return c.json({ locales: [...SUPPORTED_LOCALES], schedules: [] }, 200);
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

  return c.json(
    {
      locales: [...SUPPORTED_LOCALES],
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
    },
    200,
  );
});

schedulesApi.openapi(getScheduleRoute, async (c) => {
  const { scheduleId } = c.req.valid("param");
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

  return c.json(
    {
      locales: [...SUPPORTED_LOCALES],
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
    },
    200,
  );
});

export default schedulesApi;
