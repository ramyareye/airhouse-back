import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { and, asc, eq, ilike, inArray } from "drizzle-orm";
import { getDb } from "../../db/client";
import { venues, venueTranslations } from "../../db/schema";
import { resolveFeaturedImageUrl } from "../../lib/media";
import type { Env } from "../../types/env";
import { cachePublic } from "../middlewares/cache.middlewares";

const SUPPORTED_LOCALES = ["en", "ko"] as const;
const LocaleSchema = z.enum(SUPPORTED_LOCALES);
const VenueLocalizedSchema = z
  .object({
    name: z.string().nullable(),
    description: z.string().nullable(),
  })
  .openapi("VenueLocalizedFields");
const VenueSchema = z
  .object({
    id: z.string(),
    imageUrl: z.string().nullable().optional(),
    logoUrl: z.string().nullable().optional(),
    featuredImageUrl: z.string().nullable().optional(),
    featuredLogoUrl: z.string().nullable().optional(),
    localized: z.object({
      en: VenueLocalizedSchema,
      ko: VenueLocalizedSchema,
    }),
  })
  .catchall(z.unknown())
  .openapi("Venue");
const VenueListResponseSchema = z
  .object({
    locales: z.array(LocaleSchema),
    venues: z.array(VenueSchema),
  })
  .openapi("VenueListResponse");
const VenueDetailResponseSchema = z
  .object({
    locales: z.array(LocaleSchema),
    venue: VenueSchema,
  })
  .openapi("VenueDetailResponse");
const ErrorSchema = z
  .object({
    error: z.string(),
  })
  .openapi("VenueApiError");
const listVenuesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Festival Content"],
  summary: "List published venues",
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
      description: "Venues retrieved successfully.",
      content: {
        "application/json": {
          schema: VenueListResponseSchema,
        },
      },
    },
  },
});
const getVenueRoute = createRoute({
  method: "get",
  path: "/{venueId}",
  tags: ["Festival Content"],
  summary: "Fetch a published venue",
  request: {
    params: z.object({
      venueId: z.string().openapi({
        param: { name: "venueId", in: "path" },
      }),
    }),
  },
  responses: {
    200: {
      description: "Venue retrieved successfully.",
      content: {
        "application/json": {
          schema: VenueDetailResponseSchema,
        },
      },
    },
    404: {
      description: "Venue not found.",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

const venuesApi = new OpenAPIHono<{ Bindings: Env }>();
venuesApi.use("/*", cachePublic());

venuesApi.openapi(listVenuesRoute, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const { q, limit } = c.req.valid("query");

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

  return c.json(
    {
      locales: [...SUPPORTED_LOCALES],
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
    },
    200,
  );
});

venuesApi.openapi(getVenueRoute, async (c) => {
  const { venueId } = c.req.valid("param");
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

  return c.json(
    {
      locales: [...SUPPORTED_LOCALES],
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
    },
    200,
  );
});

export default venuesApi;
