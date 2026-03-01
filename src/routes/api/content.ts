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

const SUPPORTED_LOCALES = ["en", "ko"] as const;
const DEFAULT_EXPORT_PREFIX = "content-exports";

const secureTokenEquals = (left: string, right: string) => {
  if (left.length !== right.length) return false;

  let mismatch = 0;
  for (let i = 0; i < left.length; i++) {
    mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return mismatch === 0;
};

const extractExportToken = (request: Request) => {
  const authz = request.headers.get("authorization");
  if (authz) {
    const [scheme, ...rest] = authz.split(" ");
    if (/^bearer$/i.test(scheme) && rest.length > 0) {
      const value = rest.join(" ").trim();
      if (value) return value;
    }
  }

  const fallback = request.headers.get("x-export-token")?.trim();
  return fallback || null;
};

const normalizeExportPrefix = (value?: string | null) => {
  const normalized = value?.trim().replace(/^\/+|\/+$/g, "");
  return normalized || DEFAULT_EXPORT_PREFIX;
};

const buildBackupId = () => new Date().toISOString().replace(/[:.]/g, "-");

const buildSnapshot = async (db: ReturnType<typeof getDb>) => {
  const [artistRows, venueRows, scheduleRows, feedRows] = await Promise.all([
    db.select().from(artists).where(eq(artists.isPublished, true)).orderBy(asc(artists.name)),
    db.select().from(venues).where(eq(venues.isPublished, true)).orderBy(asc(venues.name)),
    db
      .select()
      .from(schedules)
      .where(eq(schedules.isPublished, true))
      .orderBy(asc(schedules.startsAt)),
    db.select().from(feedItems).orderBy(desc(feedItems.publishedAt)),
  ]);

  const [artistKoRows, venueKoRows, scheduleKoRows, feedKoRows, scheduleArtistRows] =
    await Promise.all([
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

  return {
    artists: artistRows.map((row) => {
      const ko = artistKoById.get(row.id);
      const { name, bio, imageUrl, ...base } = row;
      const resolvedImageUrl = resolveFeaturedImageUrl(imageUrl);
      return {
        ...base,
        imageUrl: resolvedImageUrl,
        featuredImageUrl: resolvedImageUrl,
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
      const { name, description, imageUrl, logoUrl, ...base } = row;
      const resolvedImageUrl = resolveFeaturedImageUrl(imageUrl);
      const resolvedLogoUrl = resolveFeaturedImageUrl(logoUrl);
      return {
        ...base,
        imageUrl: resolvedImageUrl,
        logoUrl: resolvedLogoUrl,
        featuredImageUrl: resolvedImageUrl,
        featuredLogoUrl: resolvedLogoUrl,
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
      const { title, body, linkLabel, imageUrl, ...base } = row;
      const resolvedImageUrl = resolveFeaturedImageUrl(imageUrl);
      return {
        ...base,
        imageUrl: resolvedImageUrl,
        featuredImageUrl: resolvedImageUrl,
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
  };
};

contentApi.get("/all", async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const snapshot = await buildSnapshot(db);
  return c.json({
    locales: SUPPORTED_LOCALES,
    ...snapshot,
  });
});

contentApi.post("/export", async (c) => {
  const configuredToken = c.env.CONTENT_EXPORT_TOKEN?.trim();
  if (!configuredToken) {
    return c.json({ error: "CONTENT_EXPORT_TOKEN is not configured" }, 503);
  }

  const providedToken = extractExportToken(c.req.raw);
  if (!providedToken || !secureTokenEquals(providedToken, configuredToken)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const exportBucket = c.env.CONTENT_EXPORT_BUCKET;
  if (!exportBucket || typeof exportBucket.put !== "function") {
    return c.json(
      {
        error:
          "CONTENT_EXPORT_BUCKET is not a valid R2 binding. Configure it under r2_buckets (not vars/secrets).",
      },
      503,
    );
  }

  const generatedAt = new Date().toISOString();
  const backupId = buildBackupId();
  const dayStamp = generatedAt.slice(0, 10);
  const prefix = normalizeExportPrefix(c.env.CONTENT_EXPORT_PREFIX);

  const db = getDb(c.env.DATABASE_URL);
  const snapshot = await buildSnapshot(db);
  const datasets = {
    artists: {
      locales: SUPPORTED_LOCALES,
      artists: snapshot.artists,
    },
    venues: {
      locales: SUPPORTED_LOCALES,
      venues: snapshot.venues,
    },
    schedules: {
      locales: SUPPORTED_LOCALES,
      schedules: snapshot.schedules,
    },
  } as const;

  const writes: Promise<unknown>[] = [];
  const keys: string[] = [];

  for (const [name, payload] of Object.entries(datasets) as Array<
    [keyof typeof datasets, (typeof datasets)[keyof typeof datasets]]
  >) {
    const json = JSON.stringify(payload);
    const latestBase = `${prefix}/${name}`;
    const backupBase = `${prefix}/backups/${backupId}/${name}`;

    const files = [
      { key: `${latestBase}.json`, body: json },
      { key: `${latestBase}-${dayStamp}.json`, body: json },
      { key: `${backupBase}.json`, body: json },
      { key: `${backupBase}-${dayStamp}.json`, body: json },
    ] as const;

    for (const file of files) {
      keys.push(file.key);
      writes.push(
        exportBucket.put(file.key, file.body, {
          httpMetadata: {
            contentType: "application/json; charset=utf-8",
          },
          customMetadata: {
            dataset: name,
            generatedAt,
            backupId,
          },
        }),
      );
    }
  }

  await Promise.all(writes);

  return c.json({
    ok: true,
    generatedAt,
    prefix,
    backupPrefix: `${prefix}/backups/${backupId}`,
    objectsWritten: keys.length,
    datasetCounts: {
      artists: snapshot.artists.length,
      venues: snapshot.venues.length,
      schedules: snapshot.schedules.length,
    },
    keys,
  });
});

export default contentApi;
