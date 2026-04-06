import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildTestEnv } from "./helpers/env";

const getSessionMock = vi.fn();
const limitMock = vi.fn();
const updateWhereMock = vi.fn();
const deleteWhereMock = vi.fn();

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
    update: () => ({
      set: () => ({
        where: updateWhereMock,
      }),
    }),
    delete: () => ({
      where: deleteWhereMock,
    }),
  }),
}));

import usersApi from "../src/routes/api/users";

describe("users api", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    limitMock.mockReset();
    updateWhereMock.mockReset();
    deleteWhereMock.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    getSessionMock.mockResolvedValue(null);

    const res = await usersApi.request("http://localhost/me", undefined, buildTestEnv());

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      success: false,
      message: "Unauthorized",
      error: "No valid session found",
    });
  });

  it("returns 404 when the session user does not exist in the database", async () => {
    getSessionMock.mockResolvedValue({
      user: { id: "user_missing" },
      session: { id: "session_1", userId: "user_missing" },
    });
    limitMock.mockResolvedValue([]);

    const res = await usersApi.request(
      "http://localhost/me",
      {
        headers: {
          Authorization: "Bearer session-token",
        },
      },
      buildTestEnv(),
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: "User not found",
    });
  });

  it("returns the current user profile for an authenticated request", async () => {
    getSessionMock.mockResolvedValue({
      user: { id: "user_1" },
      session: { id: "session_1", userId: "user_1" },
    });
    limitMock.mockResolvedValue([
      {
        id: "user_1",
        name: "Air House",
        email: "team@airhouse.name",
        emailVerified: true,
        phoneNumber: "+15555550123",
        phoneNumberVerified: true,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
    ]);

    const res = await usersApi.request(
      "http://localhost/me",
      {
        headers: {
          Authorization: "Bearer session-token",
        },
      },
      buildTestEnv(),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      user: {
        id: "user_1",
        name: "Air House",
        email: "team@airhouse.name",
        emailVerified: true,
        phoneNumber: "+15555550123",
        phoneNumberVerified: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      },
    });
  });

  it("deletes the authenticated account and clears related records", async () => {
    getSessionMock.mockResolvedValue({
      user: { id: "user_1" },
      session: { id: "session_1", userId: "user_1" },
    });
    limitMock.mockResolvedValue([
      {
        id: "user_1",
        email: "team@airhouse.name",
      },
    ]);
    updateWhereMock.mockResolvedValue(undefined);
    deleteWhereMock.mockResolvedValue(undefined);

    const res = await usersApi.request(
      "http://localhost/account",
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
      message: "Account deleted",
    });
    expect(updateWhereMock).toHaveBeenCalledTimes(1);
    expect(deleteWhereMock).toHaveBeenCalledTimes(3);
  });

  it("returns 200 when the account was already anonymized", async () => {
    getSessionMock.mockResolvedValue({
      user: { id: "user_1" },
      session: { id: "session_1", userId: "user_1" },
    });
    limitMock.mockResolvedValue([
      {
        id: "user_1",
        email: "deleted+user_1@airhouse.invalid",
      },
    ]);

    const res = await usersApi.request(
      "http://localhost/account",
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
      message: "Account already deleted",
    });
    expect(updateWhereMock).not.toHaveBeenCalled();
    expect(deleteWhereMock).not.toHaveBeenCalled();
  });
});
