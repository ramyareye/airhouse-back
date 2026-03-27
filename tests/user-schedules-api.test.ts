import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildTestEnv } from "./helpers/env";

const getSessionMock = vi.fn();
const selectLimitMock = vi.fn();
const listOrderByMock = vi.fn();
const insertOnConflictDoNothingMock = vi.fn();
const deleteWhereMock = vi.fn();

vi.mock("../src/worker/index", () => ({
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
        innerJoin: () => ({
          where: () => ({
            orderBy: listOrderByMock,
          }),
        }),
        where: () => ({
          limit: selectLimitMock,
        }),
      }),
    }),
    insert: () => ({
      values: () => ({
        onConflictDoNothing: insertOnConflictDoNothingMock,
      }),
    }),
    delete: () => ({
      where: deleteWhereMock,
    }),
  }),
}));

import { emailNotVerifiedResponse } from "../src/routes/middlewares/auth.middlewares";
import usersApi from "../src/routes/api/users";

describe("user schedules api", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    selectLimitMock.mockReset();
    listOrderByMock.mockReset();
    insertOnConflictDoNothingMock.mockReset();
    deleteWhereMock.mockReset();
  });

  it("lists the authenticated user's saved schedules", async () => {
    getSessionMock.mockResolvedValue({
      user: {
        id: "user_1",
        email: "team@airhouse.name",
        emailVerified: false,
      },
      session: { id: "session_1", userId: "user_1" },
    });
    listOrderByMock.mockResolvedValue([
      {
        scheduleId: "schedule_2",
        createdAt: "2026-03-27T10:00:00.000Z",
      },
      {
        scheduleId: "schedule_1",
        createdAt: "2026-03-26T10:00:00.000Z",
      },
    ]);

    const res = await usersApi.request(
      "http://localhost/me/schedules",
      {
        headers: {
          Authorization: "Bearer session-token",
        },
      },
      buildTestEnv(),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      schedules: [
        {
          scheduleId: "schedule_2",
          createdAt: "2026-03-27T10:00:00.000Z",
        },
        {
          scheduleId: "schedule_1",
          createdAt: "2026-03-26T10:00:00.000Z",
        },
      ],
    });
  });

  it("rejects adding a schedule for unverified email users", async () => {
    getSessionMock.mockResolvedValue({
      user: {
        id: "user_1",
        email: "team@airhouse.name",
        emailVerified: false,
      },
      session: { id: "session_1", userId: "user_1" },
    });
    selectLimitMock.mockResolvedValueOnce([{ emailVerified: false }]);

    const res = await usersApi.request(
      "http://localhost/me/schedules",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer session-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scheduleId: "6b6d2f7d-2875-4b5b-bf31-41de62b862c2",
        }),
      },
      buildTestEnv(),
    );

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual(emailNotVerifiedResponse);
    expect(insertOnConflictDoNothingMock).not.toHaveBeenCalled();
  });

  it("adds a published schedule for verified users", async () => {
    getSessionMock.mockResolvedValue({
      user: {
        id: "user_1",
        email: "verified@airhouse.name",
        emailVerified: true,
      },
      session: { id: "session_1", userId: "user_1" },
    });
    insertOnConflictDoNothingMock.mockResolvedValue(undefined);
    selectLimitMock.mockResolvedValueOnce([
      { id: "6b6d2f7d-2875-4b5b-bf31-41de62b862c2" },
    ]);

    const res = await usersApi.request(
      "http://localhost/me/schedules",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer session-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scheduleId: "6b6d2f7d-2875-4b5b-bf31-41de62b862c2",
        }),
      },
      buildTestEnv(),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      saved: true,
      scheduleId: "6b6d2f7d-2875-4b5b-bf31-41de62b862c2",
    });
    expect(insertOnConflictDoNothingMock).toHaveBeenCalledTimes(1);
  });

  it("removes a saved schedule for verified users", async () => {
    getSessionMock.mockResolvedValue({
      user: {
        id: "user_1",
        email: "verified@airhouse.name",
        emailVerified: true,
      },
      session: { id: "session_1", userId: "user_1" },
    });
    deleteWhereMock.mockResolvedValue(undefined);

    const res = await usersApi.request(
      "http://localhost/me/schedules/6b6d2f7d-2875-4b5b-bf31-41de62b862c2",
      {
        method: "DELETE",
        headers: {
          Authorization: "Bearer session-token",
        },
      },
      buildTestEnv(),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      saved: false,
      scheduleId: "6b6d2f7d-2875-4b5b-bf31-41de62b862c2",
    });
    expect(deleteWhereMock).toHaveBeenCalledTimes(1);
  });
});
