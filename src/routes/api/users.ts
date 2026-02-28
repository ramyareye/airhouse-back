import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { user } from "../../../auth-schema";
import { getDb } from "../../db/client";
import type { AuthBindings, AuthContext } from "../../types/auth";
import { protect } from "../middlewares/auth.middlewares";

const usersApi = new Hono<AuthBindings>();
usersApi.use("/*", protect);

usersApi.get("/me", async (c: AuthContext) => {
  const sessionUser = c.get("user");
  const db = getDb(c.env.DATABASE_URL);

  const [currentUser] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
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

export default usersApi;
