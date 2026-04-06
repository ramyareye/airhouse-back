import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { account, session, user } from "../../../auth-schema";
import { getDb } from "../../db/client";
import { schedules, userSchedules } from "../../db/schema";
import type { AuthBindings, AuthContext } from "../../types/auth";
import { protect, requireVerifiedUser } from "../middlewares/auth.middlewares";
import { validateJsonBody } from "../middlewares/validation.middlewares";

const usersApi = new Hono<AuthBindings>();
usersApi.use("/*", protect);
const DELETED_ACCOUNT_DOMAIN = "airhouse.invalid";

const saveScheduleBodySchema = z.object({
  scheduleId: z.string().trim().min(1, "scheduleId is required"),
});

const buildDeletedAccountEmail = (userId: string) => `deleted+${userId}@${DELETED_ACCOUNT_DOMAIN}`;
const isDeletedAccountEmail = (email?: string | null) =>
  typeof email === "string" && email.endsWith(`@${DELETED_ACCOUNT_DOMAIN}`);

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
      and(eq(userSchedules.scheduleId, schedules.id), eq(schedules.isPublished, true)),
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

usersApi.delete("/account", async (c: AuthContext) => {
  const sessionUser = c.get("user");
  const db = getDb(c.env.DATABASE_URL);

  const [currentUser] = await db
    .select({
      id: user.id,
      email: user.email,
    })
    .from(user)
    .where(eq(user.id, sessionUser.id))
    .limit(1);

  if (!currentUser) {
    return c.json({ error: "User not found" }, 404);
  }

  if (isDeletedAccountEmail(currentUser.email)) {
    return c.json({ message: "Account already deleted" }, 200);
  }

  try {
    await db
      .update(user)
      .set({
        name: "Deleted User",
        email: buildDeletedAccountEmail(currentUser.id),
        emailVerified: false,
        phoneNumber: null,
        phoneNumberVerified: false,
        image: null,
        updatedAt: new Date(),
      })
      .where(eq(user.id, sessionUser.id));

    await db.delete(userSchedules).where(eq(userSchedules.userId, sessionUser.id));
    await db.delete(session).where(eq(session.userId, sessionUser.id));
    await db.delete(account).where(eq(account.userId, sessionUser.id));

    return c.json({ message: "Account deleted" });
  } catch (error) {
    console.error("Error deleting account:", error);
    return c.json({ error: "Failed to delete account" }, 500);
  }
});

usersApi.post(
  "/me/schedules",
  requireVerifiedUser,
  validateJsonBody(saveScheduleBodySchema),
  async (c: AuthContext) => {
    const sessionUser = c.get("user");
    const { scheduleId } = c.get("validatedBody") as z.infer<typeof saveScheduleBodySchema>;

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
  },
);

usersApi.delete("/me/schedules/:scheduleId", requireVerifiedUser, async (c: AuthContext) => {
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
    .where(and(eq(userSchedules.userId, sessionUser.id), eq(userSchedules.scheduleId, scheduleId)));

  return c.json({
    saved: false,
    scheduleId,
  });
});

export default usersApi;
