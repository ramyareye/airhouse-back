import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { user } from "../../../auth-schema";
import { getDb } from "../../db/client";
import { schedules, userSchedules } from "../../db/schema";
import type { AuthBindings, AuthContext } from "../../types/auth";
import { protect, requireVerifiedUser } from "../middlewares/auth.middlewares";

const usersApi = new Hono<AuthBindings>();
usersApi.use("/*", protect);

// Keep /me available to signed-in but unverified users so the app can
// surface verification status and offer resend / refresh actions.
usersApi.get("/me", async (c: AuthContext) => {
  const sessionUser = c.get("user");
  const db = getDb(c.env.DATABASE_URL);

  const [currentUser] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      phoneNumber: user.phoneNumber,
      phoneNumberVerified: user.phoneNumberVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .where(eq(user.id, sessionUser.id))
    .limit(1);

  if (!currentUser) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json({ user: currentUser });
});

usersApi.get("/me/schedules", async (c: AuthContext) => {
  const sessionUser = c.get("user");
  const db = getDb(c.env.DATABASE_URL);

  const rows = await db
    .select({
      createdAt: userSchedules.createdAt,
      scheduleId: userSchedules.scheduleId,
    })
    .from(userSchedules)
    .innerJoin(
      schedules,
      and(
        eq(userSchedules.scheduleId, schedules.id),
        eq(schedules.isPublished, true),
      ),
    )
    .where(eq(userSchedules.userId, sessionUser.id))
    .orderBy(desc(userSchedules.createdAt));

  return c.json({
    schedules: rows.map((row) => ({
      createdAt: row.createdAt,
      scheduleId: row.scheduleId,
    })),
  });
});

usersApi.post("/me/schedules", requireVerifiedUser, async (c: AuthContext) => {
  const sessionUser = c.get("user");
  const payload = (await c.req.json().catch(() => ({}))) as {
    scheduleId?: string;
  };
  const scheduleId = payload.scheduleId?.trim();

  if (!scheduleId) {
    return c.json(
      {
        error: "Missing scheduleId",
      },
      400,
    );
  }

  const db = getDb(c.env.DATABASE_URL);
  const [schedule] = await db
    .select({ id: schedules.id })
    .from(schedules)
    .where(and(eq(schedules.id, scheduleId), eq(schedules.isPublished, true)))
    .limit(1);

  if (!schedule) {
    return c.json(
      {
        error: "Schedule not found",
      },
      404,
    );
  }

  await db
    .insert(userSchedules)
    .values({
      scheduleId,
      userId: sessionUser.id,
    })
    .onConflictDoNothing();

  return c.json({
    saved: true,
    scheduleId,
  });
});

usersApi.delete(
  "/me/schedules/:scheduleId",
  requireVerifiedUser,
  async (c: AuthContext) => {
    const sessionUser = c.get("user");
    const scheduleId = c.req.param("scheduleId")?.trim();

    if (!scheduleId) {
      return c.json(
        {
          error: "Missing scheduleId",
        },
        400,
      );
    }

    const db = getDb(c.env.DATABASE_URL);
    await db
      .delete(userSchedules)
      .where(
        and(
          eq(userSchedules.userId, sessionUser.id),
          eq(userSchedules.scheduleId, scheduleId),
        ),
      );

    return c.json({
      saved: false,
      scheduleId,
    });
  },
);

export default usersApi;
