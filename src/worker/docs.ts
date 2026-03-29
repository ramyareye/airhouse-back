import type { Env } from "../types/env";

export const openApiConfig = {
  openapi: "3.0.0" as const,
  info: {
    title: "Airhouse Festival Backend API",
    version: "1.0.0",
    description:
      "OpenAPI document for the Airhouse Cloudflare Worker API. Coverage is incremental and focuses on the festival content and profile endpoints.",
  },
};

export function shouldExposePublicDocs(env: Env): boolean {
  const override = env.PUBLIC_API_DOCS_ENABLED?.trim();
  if (override === "1") return true;
  if (override === "0") return false;

  const isProd = Boolean(env.CF_VERSION_METADATA?.id);
  return !isProd;
}
