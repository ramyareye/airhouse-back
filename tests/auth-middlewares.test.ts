import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildTestEnv } from "./helpers/env";
import type { AuthBindings } from "../src/types/auth";

const getSessionMock = vi.fn();
const limitMock = vi.fn();

vi.mock("../src/worker/auth/create-auth", () => ({
  createAuth: () => ({
    api: {
      getSession: getSessionMock,
    },
  }),
}));

vi.mock("../src/db/client", () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: limitMock,
        }),
      }),
    }),
  }),
}));

import {
  emailNotVerifiedResponse,
  protect,
  requireVerifiedUser,
} from "../src/routes/middlewares/auth.middlewares";

function buildVerifiedRouteApp() {
  const app = new Hono<AuthBindings>();

  app.use("/*", protect, requireVerifiedUser);
  app.get("/secure", (c) =>
    c.json({
      ok: true,
      userId: c.get("user").id,
    }),
  );

  return app;
}

describe("auth middlewares", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    limitMock.mockReset();
  });

  it("rejects signed-in users whose email is not verified", async () => {
    getSessionMock.mockResolvedValue({
      user: {
        id: "user_1",
        email: "team@airhouse.name",
        emailVerified: false,
      },
      session: {
        id: "session_1",
        userId: "user_1",
      },
    });
    limitMock.mockResolvedValue([{ emailVerified: false }]);

    const res = await buildVerifiedRouteApp().request(
      "http://localhost/secure",
      {
        headers: {
          Authorization: "Bearer session-token",
        },
      },
      buildTestEnv(),
    );

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual(emailNotVerifiedResponse);
  });

  it("allows verified email users through", async () => {
    getSessionMock.mockResolvedValue({
      user: {
        id: "user_2",
        email: "verified@airhouse.name",
        emailVerified: false,
      },
      session: {
        id: "session_2",
        userId: "user_2",
      },
    });
    limitMock.mockResolvedValue([{ emailVerified: true }]);

    const res = await buildVerifiedRouteApp().request(
      "http://localhost/secure",
      {
        headers: {
          Authorization: "Bearer session-token",
        },
      },
      buildTestEnv(),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      userId: "user_2",
    });
  });

  it("allows phone-only users through", async () => {
    getSessionMock.mockResolvedValue({
      user: {
        id: "user_3",
        phoneNumber: "+821012345678",
        phoneNumberVerified: true,
      },
      session: {
        id: "session_3",
        userId: "user_3",
      },
    });

    const res = await buildVerifiedRouteApp().request(
      "http://localhost/secure",
      {
        headers: {
          Authorization: "Bearer session-token",
        },
      },
      buildTestEnv(),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      userId: "user_3",
    });
  });
});
