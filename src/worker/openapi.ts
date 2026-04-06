import type { OpenAPIHono } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import type { Env } from "../types/env";

type WorkerOpenAPIApp = OpenAPIHono<{ Bindings: Env }>;

const looseObjectSchema = z.object({}).catchall(z.unknown()).openapi("LooseObject");
const errorSchema = z.object({ error: z.string() }).openapi("SimpleError");
const cachePurgeResponseSchema = z
  .object({
    purged: z.boolean(),
    cacheVersion: z.string(),
    note: z.string(),
  })
  .openapi("CachePurgeResponse");
const userScheduleMutationSchema = z
  .object({
    saved: z.boolean(),
    scheduleId: z.string(),
  })
  .openapi("UserScheduleMutationResponse");

const bearerSecurity = [{ BearerAuth: [] }];

const jsonResponse = (schema: z.ZodTypeAny, description: string) => ({
  description,
  content: {
    "application/json": {
      schema,
    },
  },
});

const authHeaderSchema = z.object({
  authorization: z.string().openapi({
    param: { name: "authorization", in: "header" },
    example: "Bearer <token>",
  }),
});

const exportTokenHeaderSchema = z.object({
  "x-export-token": z.string().openapi({
    param: { name: "x-export-token", in: "header" },
  }),
});

const cachePurgeHeaderSchema = z.object({
  "x-cache-purge-token": z.string().openapi({
    param: { name: "x-cache-purge-token", in: "header" },
  }),
});

const scheduleIdParamSchema = z.object({
  scheduleId: z.string().openapi({
    param: { name: "scheduleId", in: "path" },
  }),
});

const saveScheduleBodySchema = z
  .object({
    scheduleId: z.string().min(1),
  })
  .openapi("SaveScheduleBody");

export function registerManualOpenApi(app: WorkerOpenAPIApp) {
  app.openAPIRegistry.registerComponent("securitySchemes", "BearerAuth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "Bearer token",
    description: "Bearer token returned by Better Auth.",
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/api/content/all",
    tags: ["Festival Content"],
    summary: "Fetch the full festival content snapshot",
    responses: {
      "200": jsonResponse(looseObjectSchema, "Festival content snapshot returned successfully."),
    },
  });

  app.openAPIRegistry.registerPath({
    method: "post",
    path: "/api/content/export",
    tags: ["Operations"],
    summary: "Export festival content JSON bundles to R2",
    request: {
      headers: exportTokenHeaderSchema,
    },
    responses: {
      "200": jsonResponse(looseObjectSchema, "Content export completed successfully."),
      "401": jsonResponse(errorSchema, "Unauthorized."),
      "503": jsonResponse(errorSchema, "Export is not configured."),
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/api/users/me",
    tags: ["User"],
    summary: "Fetch the authenticated user profile",
    security: bearerSecurity,
    request: {
      headers: authHeaderSchema,
    },
    responses: {
      "200": jsonResponse(looseObjectSchema, "Authenticated user profile returned successfully."),
      "401": jsonResponse(errorSchema, "Unauthorized."),
      "404": jsonResponse(errorSchema, "User not found."),
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/api/users/me/schedules",
    tags: ["User"],
    summary: "List saved schedules for the authenticated user",
    security: bearerSecurity,
    request: {
      headers: authHeaderSchema,
    },
    responses: {
      "200": jsonResponse(looseObjectSchema, "Saved schedules returned successfully."),
      "401": jsonResponse(errorSchema, "Unauthorized."),
    },
  });

  app.openAPIRegistry.registerPath({
    method: "delete",
    path: "/api/users/account",
    tags: ["User"],
    summary: "Delete the authenticated user's account",
    security: bearerSecurity,
    request: {
      headers: authHeaderSchema,
    },
    responses: {
      "200": jsonResponse(looseObjectSchema, "Account deleted successfully."),
      "401": jsonResponse(errorSchema, "Unauthorized."),
      "404": jsonResponse(errorSchema, "User not found."),
      "500": jsonResponse(errorSchema, "Failed to delete account."),
    },
  });

  app.openAPIRegistry.registerPath({
    method: "post",
    path: "/api/users/me/schedules",
    tags: ["User"],
    summary: "Save a schedule for the authenticated user",
    security: bearerSecurity,
    request: {
      headers: authHeaderSchema,
      body: {
        content: {
          "application/json": {
            schema: saveScheduleBodySchema,
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Schedule saved successfully.",
        content: {
          "application/json": {
            schema: userScheduleMutationSchema,
          },
        },
      },
      "400": jsonResponse(errorSchema, "Invalid request body."),
      "401": jsonResponse(errorSchema, "Unauthorized."),
      "403": jsonResponse(looseObjectSchema, "Email verification required."),
      "404": jsonResponse(errorSchema, "Schedule not found."),
    },
  });

  app.openAPIRegistry.registerPath({
    method: "delete",
    path: "/api/users/me/schedules/{scheduleId}",
    tags: ["User"],
    summary: "Remove a saved schedule for the authenticated user",
    security: bearerSecurity,
    request: {
      headers: authHeaderSchema,
      params: scheduleIdParamSchema,
    },
    responses: {
      "200": {
        description: "Saved schedule removed successfully.",
        content: {
          "application/json": {
            schema: userScheduleMutationSchema,
          },
        },
      },
      "400": jsonResponse(errorSchema, "Invalid schedule id."),
      "401": jsonResponse(errorSchema, "Unauthorized."),
      "403": jsonResponse(looseObjectSchema, "Email verification required."),
    },
  });

  app.openAPIRegistry.registerPath({
    method: "post",
    path: "/api/cache/purge",
    tags: ["Operations"],
    summary: "Purge the current isolate cache version",
    request: {
      headers: cachePurgeHeaderSchema,
    },
    responses: {
      "200": {
        description: "Cache version overridden successfully.",
        content: {
          "application/json": {
            schema: cachePurgeResponseSchema,
          },
        },
      },
      "403": jsonResponse(errorSchema, "Unauthorized."),
      "501": jsonResponse(errorSchema, "Cache purge not configured."),
    },
  });
}
