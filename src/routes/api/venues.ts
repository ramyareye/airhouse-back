import { Hono } from "hono";
import { and, asc, eq, ilike } from "drizzle-orm";
import { getDb } from "../../db/client";
import { venues } from "../../db/schema";
import type { Env } from "../../types/env";

const venuesApi = new Hono<{ Bindings: Env }>();

venuesApi.get("/", async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const q = c.req.query("q")?.trim();
  const city = c.req.query("city")?.trim();
  const limit = Math.min(Math.max(Number(c.req.query("limit")) || 50, 1), 200);

  const where = and(
    eq(venues.isPublished, true),
    q ? ilike(venues.name, `%${q}%`) : undefined,
    city ? ilike(venues.city, city) : undefined,
  );

  const rows = await db
    .select()
    .from(venues)
    .where(where)
    .orderBy(asc(venues.name))
    .limit(limit);

  return c.json({ venues: rows });
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

  return c.json({ venue: row });
});

export default venuesApi;
