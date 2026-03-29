import { describe, expect, it } from "vitest";
import { shouldExposePublicDocs } from "../src/worker/docs";
import { buildTestEnv } from "./helpers/env";

describe("public docs visibility", () => {
  it("shows docs by default outside production", () => {
    expect(shouldExposePublicDocs(buildTestEnv())).toBe(true);
  });

  it("hides docs by default in production", () => {
    expect(
      shouldExposePublicDocs(buildTestEnv({ CF_VERSION_METADATA: { id: "prod-version" } })),
    ).toBe(false);
  });

  it("allows explicit enable in production", () => {
    expect(
      shouldExposePublicDocs(
        buildTestEnv({
          CF_VERSION_METADATA: { id: "prod-version" },
          PUBLIC_API_DOCS_ENABLED: "1",
        }),
      ),
    ).toBe(true);
  });

  it("allows explicit disable in development", () => {
    expect(
      shouldExposePublicDocs(
        buildTestEnv({
          PUBLIC_API_DOCS_ENABLED: "0",
        }),
      ),
    ).toBe(false);
  });
});
