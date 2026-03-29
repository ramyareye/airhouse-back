import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { and, asc, eq, ilike, inArray } from "drizzle-orm";
import { getDb } from "../../db/client";
import { artists, artistTranslations } from "../../db/schema";
import { resolveFeaturedImageUrl } from "../../lib/media";
import type { Env } from "../../types/env";
import { cachePublic } from "../middlewares/cache.middlewares";

const SUPPORTED_LOCALES = ["en", "ko"] as const;
const LocaleSchema = z.enum(SUPPORTED_LOCALES);
const ArtistLocalizedSchema = z
  .object({
    name: z.string().nullable(),
    bio: z.string().nullable(),
  })
  .openapi("ArtistLocalizedFields");
const ArtistSchema = z
  .object({
    id: z.string(),
    imageUrl: z.string().nullable().optional(),
    featuredImageUrl: z.string().nullable().optional(),
    localized: z.object({
      en: ArtistLocalizedSchema,
      ko: ArtistLocalizedSchema,
    }),
  })
  .catchall(z.unknown())
  .openapi("Artist");
const ArtistListResponseSchema = z
  .object({
    locales: z.array(LocaleSchema),
    artists: z.array(ArtistSchema),
  })
  .openapi("ArtistListResponse");
const ArtistDetailResponseSchema = z
  .object({
    locales: z.array(LocaleSchema),
    artist: ArtistSchema,
  })
  .openapi("ArtistDetailResponse");
const ErrorSchema = z
  .object({
    error: z.string(),
  })
  .openapi("ArtistApiError");
const listArtistsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Festival Content"],
  summary: "List published artists",
  request: {
    query: z.object({
      q: z
        .string()
        .trim()
        .min(1)
        .optional()
        .openapi({ param: { name: "q", in: "query" } }),
      limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(200)
        .default(50)
        .openapi({
          param: { name: "limit", in: "query" },
          example: 50,
        }),
    }),
  },
  responses: {
    200: {
      description: "Artists retrieved successfully.",
      content: {
        "application/json": {
          schema: ArtistListResponseSchema,
        },
      },
    },
  },
});
const getArtistRoute = createRoute({
  method: "get",
  path: "/{artistId}",
  tags: ["Festival Content"],
  summary: "Fetch a published artist",
  request: {
    params: z.object({
      artistId: z.string().openapi({
        param: { name: "artistId", in: "path" },
      }),
    }),
  },
  responses: {
    200: {
      description: "Artist retrieved successfully.",
      content: {
        "application/json": {
          schema: ArtistDetailResponseSchema,
        },
      },
    },
    404: {
      description: "Artist not found.",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

const artistsApi = new OpenAPIHono<{ Bindings: Env }>();
artistsApi.use("/*", cachePublic());

artistsApi.openapi(listArtistsRoute, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const { q, limit } = c.req.valid("query");

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

  return c.json(
    {
      locales: [...SUPPORTED_LOCALES],
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
    },
    200,
  );
});

artistsApi.openapi(getArtistRoute, async (c) => {
  const { artistId } = c.req.valid("param");
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

  return c.json(
    {
      locales: [...SUPPORTED_LOCALES],
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
    },
    200,
  );
});

export default artistsApi;
