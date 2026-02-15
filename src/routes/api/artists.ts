import { Hono } from "hono";
import { and, asc, eq, ilike } from "drizzle-orm";
import { getDb } from "../../db/client";
import { artists } from "../../db/schema";
import type { Env } from "../../types/env";

const artistsApi = new Hono<{ Bindings: Env }>();

artistsApi.get("/", async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const q = c.req.query("q")?.trim();
  const limit = Math.min(Math.max(Number(c.req.query("limit")) || 50, 1), 200);

  const where = and(
    eq(artists.isPublished, true),
    q ? ilike(artists.name, `%${q}%`) : undefined,
  );

  const rows = await db
    .select()
    .from(artists)
    .where(where)
    .orderBy(asc(artists.name))
    .limit(limit);

  return c.json({ artists: rows });
});

artistsApi.get("/:artistId", async (c) => {
  const artistId = c.req.param("artistId");
  const db = getDb(c.env.DATABASE_URL);

  const [row] = await db
    .select()
    .from(artists)
    .where(and(eq(artists.id, artistId), eq(artists.isPublished, true)))
    .limit(1);

  if (!row) {
    return c.json({ error: "Artist not found" }, 404);
  }

  return c.json({ artist: row });
});

export default artistsApi;
